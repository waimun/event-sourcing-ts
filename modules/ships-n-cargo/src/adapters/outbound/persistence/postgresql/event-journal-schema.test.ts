import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import { afterEach, expect, test, vi } from 'vitest'
import { EventJournalSchemaIncompatible } from '../errors/event-journal'
import { EVENT_JOURNAL_CONSTRAINTS, verifyEventJournalSchema } from './event-journal-schema'

const result = <TRow extends QueryResultRow>(rows: TRow[]): QueryResult<TRow> => ({
  command: '',
  rowCount: rows.length,
  oid: 0,
  fields: [],
  rows
})

const columns = [
  {
    column_name: 'aggregate_id',
    data_type: 'text',
    is_nullable: 'NO',
    is_identity: 'NO',
    identity_generation: null
  },
  {
    column_name: 'version',
    data_type: 'bigint',
    is_nullable: 'NO',
    is_identity: 'NO',
    identity_generation: null
  },
  {
    column_name: 'event_payload',
    data_type: 'text',
    is_nullable: 'NO',
    is_identity: 'NO',
    identity_generation: null
  }
]

const constraints = [
  {
    constraint_definition: 'PRIMARY KEY (aggregate_id, version)',
    constraint_name: EVENT_JOURNAL_CONSTRAINTS.streamPosition,
    constraint_type: 'PRIMARY KEY',
    columns: ['aggregate_id', 'version']
  },
  {
    constraint_definition: 'CHECK ((version > 0))',
    constraint_name: EVENT_JOURNAL_CONSTRAINTS.positiveVersion,
    constraint_type: 'CHECK',
    columns: ['version']
  }
]

const pools: Pool[] = []
const makePool = (columnRows = columns, constraintRows = constraints): Pool => {
  const pool = new Pool()
  pools.push(pool)
  vi.spyOn(pool, 'query')
    .mockResolvedValueOnce(result(columnRows) as never)
    .mockResolvedValueOnce(result(constraintRows) as never)
  return pool
}

afterEach(async () => {
  await Promise.all(pools.splice(0).map((pool) => pool.end()))
})

test('accepts the checked-in event journal shape and constraints', async () => {
  await expect(verifyEventJournalSchema(makePool())).resolves.toBeUndefined()
})

test('reports incompatible columns', async () => {
  await expect(verifyEventJournalSchema(makePool(columns.slice(0, 2)))).rejects.toThrow(
    EventJournalSchemaIncompatible
  )
})

test('reports a missing stream-position primary key', async () => {
  await expect(verifyEventJournalSchema(makePool(columns, constraints.slice(1)))).rejects.toThrow(
    `required stream-position primary key '${EVENT_JOURNAL_CONSTRAINTS.streamPosition} (aggregate_id, version)' is missing`
  )
})

test('reports a missing positive-version check', async () => {
  await expect(
    verifyEventJournalSchema(makePool(columns, constraints.slice(0, 1)))
  ).rejects.toThrow(
    `required check constraint '${EVENT_JOURNAL_CONSTRAINTS.positiveVersion} CHECK ((version > 0))' is missing or incompatible`
  )
})

test('rejects a same-named check with an incompatible definition', async () => {
  const incompatibleConstraints = constraints.map((constraint) =>
    constraint.constraint_name === EVENT_JOURNAL_CONSTRAINTS.positiveVersion
      ? { ...constraint, constraint_definition: 'CHECK ((version >= 0))' }
      : constraint
  )

  await expect(
    verifyEventJournalSchema(makePool(columns, incompatibleConstraints))
  ).rejects.toThrow(EventJournalSchemaIncompatible)
})
