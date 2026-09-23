import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import { Country } from '../../../domain/country'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipCreated } from '../../../domain/events/ship-created'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { EventJournalUnavailable } from '../../../shared/error'
import { EventJournalSchemaIncompatible } from './errors/event-journal'
import { PostgreSqlEventJournal } from './postgresql-event-journal'
import {
  EVENT_JOURNAL_CONSTRAINTS,
  verifyEventJournalSchema
} from './postgresql-event-journal-schema'

const connectionString = process.env.TEST_DATABASE_URL
const databaseDescribe = connectionString === undefined ? describe.skip : describe
const sqlPath = fileURLToPath(new URL('../../../../sql/001-event-journal.sql', import.meta.url))

databaseDescribe('PostgreSQL event journal', () => {
  let pool: Pool
  let initialSql: string

  beforeAll(async () => {
    initialSql = await readFile(sqlPath, 'utf8')
    pool = new Pool({ connectionString })
  })

  beforeEach(async () => {
    await pool.query('DROP SCHEMA IF EXISTS ships_n_cargo CASCADE')
    await pool.query(initialSql)
  })

  afterAll(async () => {
    await pool.query('DROP SCHEMA IF EXISTS ships_n_cargo CASCADE')
    await pool.end()
  })

  test('initial SQL is idempotent and verifies the resulting schema', async () => {
    await pool.query(initialSql)
    await expect(verifyEventJournalSchema(pool)).resolves.toBeUndefined()
  })

  test('setup verification rejects an existing incompatible table', async () => {
    await pool.query('DROP TABLE ships_n_cargo.event_journal')
    await pool.query('CREATE TABLE ships_n_cargo.event_journal (aggregate_id TEXT PRIMARY KEY)')
    await pool.query(initialSql)

    await expect(verifyEventJournalSchema(pool)).rejects.toThrow(EventJournalSchemaIncompatible)
  })

  test('setup verification rejects a same-named incompatible version check', async () => {
    await pool.query(`
      ALTER TABLE ships_n_cargo.event_journal
        DROP CONSTRAINT ${EVENT_JOURNAL_CONSTRAINTS.positiveVersion},
        ADD CONSTRAINT ${EVENT_JOURNAL_CONSTRAINTS.positiveVersion} CHECK (version >= 0)
    `)

    await expect(verifyEventJournalSchema(pool)).rejects.toThrow(EventJournalSchemaIncompatible)
  })

  test('replays in version order after the journal and its pool are replaced', async () => {
    const writerPool = new Pool({ connectionString })
    const writer = new PostgreSqlEventJournal(writerPool)
    const created = new ShipCreated('ship-1', 'King Roy')
    const arrived = new ShipArrived('ship-1', new Port(new PortName('Kingston'), new Country('US')))
    await writer.append('ship-1', 0, [created, arrived])
    await writerPool.end()

    const readerPool = new Pool({ connectionString })
    const stream = await new PostgreSqlEventJournal(readerPool).eventsByAggregate('ship-1')
    await readerPool.end()

    expect(stream).toEqual({ events: [created, arrived], version: 2 })
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
      journal.append('ship-1', 0, [
        new ShipCreated('ship-1', 'King Roy'),
        new ShipArrived('ship-1', new Port(new PortName('Kingston'), new Country('US')))
      ])
    ).rejects.toThrow(EventJournalUnavailable)
    await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
      events: [],
      version: 0
    })
  })

  test('allows only one of two competing version-zero appends', async () => {
    const first = new PostgreSqlEventJournal(pool)
    const second = new PostgreSqlEventJournal(pool)

    const attempts = await Promise.allSettled([
      first.append('ship-1', 0, [new ShipCreated('ship-1', 'First')]),
      second.append('ship-1', 0, [new ShipCreated('ship-1', 'Second')])
    ])

    expect(attempts.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    const rejected = attempts.find(({ status }) => status === 'rejected')
    expect(rejected).toMatchObject({ reason: expect.any(JournalVersionConflict) })
    expect(await first.eventsByAggregate('ship-1')).toMatchObject({ version: 1 })
  })
})
