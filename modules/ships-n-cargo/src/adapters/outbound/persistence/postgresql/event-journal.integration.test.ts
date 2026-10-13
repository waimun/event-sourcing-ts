import { readFile } from 'node:fs/promises'
import { Pool, type QueryResultRow } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { JournalVersionConflict } from '../../../../application/errors/journal-version-conflict'
import { EventJournalUnavailable } from '../../../../application/ports/errors/event-journal-unavailable'
import { Country } from '../../../../domain/country'
import { ShipArrived } from '../../../../domain/events/ship-arrived'
import { ShipDeparted } from '../../../../domain/events/ship-departed'
import { ShipRegistered } from '../../../../domain/events/ship-registered'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { PostgreSqlShipOverviewProjection } from '../../projections/postgresql-ship-overview'
import { eventJournalContract } from '../event-journal-contract'
import { PostgreSqlEventJournal } from './event-journal'
import { migrateEventJournalSchema } from './event-journal-migrations'
import { EVENT_JOURNAL_CONSTRAINTS } from './event-journal-schema'

const connectionString = process.env.TEST_POSTGRESQL_URL
const databaseDescribe = connectionString === undefined ? describe.skip : describe
const port = () => new Port(new PortName('Kingston'), new Country('US'))
const registration = (id: string, name = 'King Roy') => new ShipRegistered(id, name, port())

interface ColumnRow extends QueryResultRow {
  column_name: string
  data_type: string
  is_identity: 'YES' | 'NO'
  is_nullable: 'YES' | 'NO'
}

interface ConstraintRow extends QueryResultRow {
  columns: string[]
  constraint_definition: string
  constraint_name: string
  constraint_type: 'PRIMARY KEY' | 'CHECK' | 'UNIQUE'
}

databaseDescribe('PostgreSQL event journal', () => {
  let pool: Pool

  beforeAll(async () => {
    pool = new Pool({ connectionString })
  })

  beforeEach(async () => {
    await pool.query('DROP SCHEMA IF EXISTS ships_n_cargo CASCADE')
    await migrateEventJournalSchema(pool)
  })

  afterAll(async () => {
    await pool.query('DROP SCHEMA IF EXISTS ships_n_cargo CASCADE')
    await pool.end()
  })

  eventJournalContract(() => new PostgreSqlEventJournal(pool))

  test('migrations are idempotent and produce the expected columns and constraints', async () => {
    await migrateEventJournalSchema(pool)

    await expect(
      pool.query('SELECT version FROM ships_n_cargo.event_journal_migrations ORDER BY version')
    ).resolves.toMatchObject({ rows: [{ version: 1 }, { version: 2 }, { version: 3 }] })

    const columns = await pool.query<ColumnRow>(`
      SELECT column_name, data_type, is_nullable, is_identity
      FROM information_schema.columns
      WHERE table_schema = 'ships_n_cargo' AND table_name = 'event_journal'
      ORDER BY ordinal_position
    `)
    expect(columns.rows).toEqual([
      { column_name: 'aggregate_id', data_type: 'text', is_nullable: 'NO', is_identity: 'NO' },
      { column_name: 'version', data_type: 'bigint', is_nullable: 'NO', is_identity: 'NO' },
      { column_name: 'event_payload', data_type: 'text', is_nullable: 'NO', is_identity: 'NO' },
      {
        column_name: 'global_position',
        data_type: 'bigint',
        is_nullable: 'NO',
        is_identity: 'NO'
      }
    ])

    const constraints = await pool.query<ConstraintRow>(`
      SELECT
        journal_constraint.conname AS constraint_name,
        CASE journal_constraint.contype
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'c' THEN 'CHECK'
          WHEN 'u' THEN 'UNIQUE'
        END AS constraint_type,
        ARRAY(
          SELECT attribute.attname::text
          FROM unnest(journal_constraint.conkey) WITH ORDINALITY AS key(attnum, ordinal_position)
          JOIN pg_catalog.pg_attribute AS attribute
            ON attribute.attrelid = journal_constraint.conrelid
            AND attribute.attnum = key.attnum
          ORDER BY key.ordinal_position
        )::text[] AS columns,
        pg_catalog.pg_get_constraintdef(journal_constraint.oid, false) AS constraint_definition
      FROM pg_catalog.pg_constraint AS journal_constraint
      JOIN pg_catalog.pg_class AS journal_table
        ON journal_table.oid = journal_constraint.conrelid
      JOIN pg_catalog.pg_namespace AS journal_schema
        ON journal_schema.oid = journal_table.relnamespace
      WHERE journal_schema.nspname = 'ships_n_cargo'
        AND journal_table.relname = 'event_journal'
      ORDER BY constraint_name
    `)
    expect(constraints.rows).toEqual([
      {
        columns: ['global_position'],
        constraint_definition: 'CHECK ((global_position > 0))',
        constraint_name: EVENT_JOURNAL_CONSTRAINTS.positiveGlobalPosition,
        constraint_type: 'CHECK'
      },
      {
        columns: ['global_position'],
        constraint_definition: 'UNIQUE (global_position)',
        constraint_name: EVENT_JOURNAL_CONSTRAINTS.globalPosition,
        constraint_type: 'UNIQUE'
      },
      {
        columns: ['aggregate_id', 'version'],
        constraint_definition: 'PRIMARY KEY (aggregate_id, version)',
        constraint_name: EVENT_JOURNAL_CONSTRAINTS.streamPosition,
        constraint_type: 'PRIMARY KEY'
      },
      {
        columns: ['version'],
        constraint_definition: 'CHECK ((version > 0))',
        constraint_name: EVENT_JOURNAL_CONSTRAINTS.positiveVersion,
        constraint_type: 'CHECK'
      }
    ])

    await expect(
      pool.query(
        `SELECT singleton, next_position::text AS next_position
         FROM ships_n_cargo.event_journal_position`
      )
    ).resolves.toMatchObject({ rows: [{ singleton: true, next_position: '1' }] })
  })

  test('rejects a non-empty version-one journal without changing its data', async () => {
    await pool.query('DROP SCHEMA ships_n_cargo CASCADE')
    await pool.query('CREATE SCHEMA ships_n_cargo')
    await pool.query(`
      CREATE TABLE ships_n_cargo.event_journal_migrations (
        version INTEGER PRIMARY KEY
      );
      INSERT INTO ships_n_cargo.event_journal_migrations (version) VALUES (1);
    `)
    await pool.query(
      await readFile(new URL('./schema/001-event-journal.sql', import.meta.url), 'utf8')
    )
    await pool.query(
      `INSERT INTO ships_n_cargo.event_journal (aggregate_id, version, event_payload)
       VALUES ('ship-1', 1, '{}')`
    )

    await expect(migrateEventJournalSchema(pool)).rejects.toThrow()

    await expect(
      pool.query(
        `SELECT aggregate_id, version::text AS version, event_payload
         FROM ships_n_cargo.event_journal`
      )
    ).resolves.toMatchObject({
      rows: [{ aggregate_id: 'ship-1', event_payload: '{}', version: '1' }]
    })
    await expect(
      pool.query('SELECT version FROM ships_n_cargo.event_journal_migrations')
    ).resolves.toMatchObject({ rows: [{ version: 1 }] })
  })

  test('replays in version order after the journal and its pool are replaced', async () => {
    const writerPool = new Pool({ connectionString })
    const writer = new PostgreSqlEventJournal(writerPool)
    const registered = registration('ship-1')
    const arrived = new ShipArrived('ship-1', port())
    await writer.append('ship-1', 0, [registered, arrived])
    await writerPool.end()

    const readerPool = new Pool({ connectionString })
    const stream = await new PostgreSqlEventJournal(readerPool).eventsByAggregate('ship-1')
    await readerPool.end()

    expect(stream).toEqual({ events: [registered, arrived], version: 2 })
  })

  test('rolls back every event when one row in a multi-event append fails', async () => {
    await pool.query(`
      CREATE FUNCTION ships_n_cargo.reject_second_event() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.version = 2 THEN
          RAISE EXCEPTION 'test rejection';
        END IF;
        RETURN NEW;
      END
      $$;
      CREATE TRIGGER reject_second_event
      BEFORE INSERT ON ships_n_cargo.event_journal
      FOR EACH ROW EXECUTE FUNCTION ships_n_cargo.reject_second_event();
    `)
    const journal = new PostgreSqlEventJournal(pool)

    await expect(
      journal.append('ship-1', 0, [registration('ship-1'), new ShipArrived('ship-1', port())])
    ).rejects.toThrow(EventJournalUnavailable)
    await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
      events: [],
      version: 0
    })
    await expect(journal.globalHeadPosition()).resolves.toBe(0n)

    const successfulEvent = registration('ship-2')
    await journal.append('ship-2', 0, [successfulEvent])
    await expect(journal.globalEventsAfter(0n, 10)).resolves.toEqual([
      { aggregateId: 'ship-2', event: successfulEvent, position: 1n, streamVersion: 1 }
    ])
  })

  test('preserves global positions beyond the JavaScript safe-integer range', async () => {
    await pool.query(
      `UPDATE ships_n_cargo.event_journal_position
       SET next_position = 9007199254740993`
    )
    const journal = new PostgreSqlEventJournal(pool)
    const event = registration('ship-1')

    await journal.append('ship-1', 0, [event])

    await expect(journal.globalHeadPosition()).resolves.toBe(9_007_199_254_740_993n)
    await expect(journal.globalEventsAfter(9_007_199_254_740_992n, 1)).resolves.toEqual([
      {
        aggregateId: 'ship-1',
        event,
        position: 9_007_199_254_740_993n,
        streamVersion: 1
      }
    ])
  })

  test('allows only one of two competing version-zero appends', async () => {
    const first = new PostgreSqlEventJournal(pool)
    const second = new PostgreSqlEventJournal(pool)

    const attempts = await Promise.allSettled([
      first.append('ship-1', 0, [registration('ship-1', 'First')]),
      second.append('ship-1', 0, [registration('ship-1', 'Second')])
    ])

    expect(attempts.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    const rejected = attempts.find(({ status }) => status === 'rejected')
    expect(rejected).toMatchObject({ reason: expect.any(JournalVersionConflict) })
    expect(await first.eventsByAggregate('ship-1')).toMatchObject({ version: 1 })
    await expect(first.globalHeadPosition()).resolves.toBe(1n)

    const nextEvent = registration('ship-2')
    await first.append('ship-2', 0, [nextEvent])
    await expect(first.globalEventsAfter(1n, 1)).resolves.toEqual([
      { aggregateId: 'ship-2', event: nextEvent, position: 2n, streamVersion: 1 }
    ])
  })

  test('serializes competing ship-overview batches through the checkpoint row', async () => {
    const journal = new PostgreSqlEventJournal(pool)
    await journal.append('ship-1', 0, [registration('ship-1'), new ShipDeparted('ship-1')])
    const first = new PostgreSqlShipOverviewProjection(pool)
    const second = new PostgreSqlShipOverviewProjection(pool)

    const batches = await Promise.all([first.projectNextBatch(1), second.projectNextBatch(1)])

    expect(batches.map(({ checkpoint }) => checkpoint).sort()).toEqual([1n, 2n])
    await expect(
      pool.query(
        `SELECT ship_id, name, status, current_port_name, current_port_country
         FROM ships_n_cargo.ship_overview`
      )
    ).resolves.toMatchObject({
      rows: [
        {
          current_port_country: null,
          current_port_name: null,
          name: 'King Roy',
          ship_id: 'ship-1',
          status: 'at-sea'
        }
      ]
    })
  })

  test('rolls back the ship overview when checkpoint advancement fails', async () => {
    const journal = new PostgreSqlEventJournal(pool)
    await journal.append('ship-1', 0, [registration('ship-1')])
    await pool.query(`
      CREATE FUNCTION ships_n_cargo.reject_checkpoint() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'test checkpoint rejection';
      END
      $$;
      CREATE TRIGGER reject_checkpoint
      BEFORE UPDATE ON ships_n_cargo.ship_overview_checkpoint
      FOR EACH ROW EXECUTE FUNCTION ships_n_cargo.reject_checkpoint();
    `)

    await expect(
      new PostgreSqlShipOverviewProjection(pool).projectNextBatch(1)
    ).rejects.toMatchObject({ code: 'SHIP_OVERVIEW_PROJECTION_UNAVAILABLE' })
    await expect(pool.query('SELECT * FROM ships_n_cargo.ship_overview')).resolves.toMatchObject({
      rows: []
    })
    await expect(
      pool.query(
        `SELECT position::text AS position
         FROM ships_n_cargo.ship_overview_checkpoint`
      )
    ).resolves.toMatchObject({ rows: [{ position: '0' }] })
  })
})
