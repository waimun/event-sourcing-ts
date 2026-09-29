import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Pool, QueryResult, QueryResultRow } from 'pg'
import { expect, test, vi } from 'vitest'
import { EventJournalSchemaIncompatible } from '../adapters/outbound/persistence/errors/event-journal'
import { EVENT_JOURNAL_CONSTRAINTS } from '../adapters/outbound/persistence/postgresql/event-journal-schema'
import { createDefaultApplication } from './composition-root'
import { EventJournalConfigurationInvalid } from './errors/event-journal-configuration-invalid'
import { PostgreSqlConnectionStringInvalid } from './errors/postgresql-connection-string-invalid'

const result = <TRow extends QueryResultRow>(rows: TRow[] = []): QueryResult<TRow> => ({
  command: '',
  rowCount: rows.length,
  oid: 0,
  fields: [],
  rows
})

const compatibleColumns = [
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

const compatibleConstraints = [
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

const fakePool = (columnRows = compatibleColumns) => {
  const query = vi
    .fn()
    .mockResolvedValueOnce(result(columnRows))
    .mockResolvedValueOnce(result(compatibleConstraints))
  const migrationQuery = vi
    .fn()
    .mockImplementation((sql: string) =>
      Promise.resolve(sql.includes('SELECT version') ? result([]) : result())
    )
  const release = vi.fn()
  const connect = vi.fn().mockResolvedValue({ query: migrationQuery, release })
  const end = vi.fn().mockResolvedValue(undefined)
  return {
    connect,
    end,
    migrationQuery,
    pool: { connect, query, end } as unknown as Pool,
    query,
    release
  }
}

const fakePoolConstructor = (pool: Pool) => {
  const construct = vi.fn()
  const PoolConstructor = class {
    readonly connect = pool.connect
    readonly end = pool.end
    readonly query = pool.query

    constructor(configuration: unknown) {
      construct(configuration)
    }
  } as unknown as typeof Pool
  return { construct, PoolConstructor }
}

test('uses the in-memory journal by default without creating a PostgreSQL pool', async () => {
  const { construct, PoolConstructor } = fakePoolConstructor(fakePool().pool)

  const runtime = await createDefaultApplication({}, PoolConstructor)

  expect(runtime.application).toBeDefined()
  expect(construct).not.toHaveBeenCalled()
  await expect(runtime.close()).resolves.toBeUndefined()
})

test('selects and closes a file-backed SQLite journal from its configured path', async () => {
  const { construct, PoolConstructor } = fakePoolConstructor(fakePool().pool)
  const close = vi.fn()
  const sqliteEventJournalFactory = vi.fn(() => ({
    append: vi.fn(),
    eventsByAggregate: vi.fn(),
    close
  })) as never

  const runtime = await createDefaultApplication(
    { SHIPS_N_CARGO_SQLITE_PATH: '  ./ships.sqlite  ' },
    PoolConstructor,
    sqliteEventJournalFactory
  )

  expect(sqliteEventJournalFactory).toHaveBeenCalledWith('./ships.sqlite')
  expect(construct).not.toHaveBeenCalled()
  expect(runtime.application).toBeDefined()
  await runtime.close()
  expect(close).toHaveBeenCalledOnce()
})

test('constructs the built-in SQLite adapter for the default SQLite factory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ships-n-cargo-composition-'))
  const databasePath = join(directory, 'journal.sqlite')

  try {
    const runtime = await createDefaultApplication({
      SHIPS_N_CARGO_SQLITE_PATH: databasePath
    })

    expect(runtime.application).toBeDefined()
    await runtime.close()
  } finally {
    await rm(directory, { recursive: true })
  }
})

test.each(['', '  '])(
  'rejects a blank SQLite path instead of falling back to memory',
  async (databasePath) => {
    await expect(
      createDefaultApplication({
        SHIPS_N_CARGO_SQLITE_PATH: databasePath
      })
    ).rejects.toThrow(EventJournalConfigurationInvalid)
  }
)

test('rejects simultaneous PostgreSQL and SQLite settings as ambiguous', async () => {
  await expect(
    createDefaultApplication({
      SHIPS_N_CARGO_POSTGRESQL_URL: 'postgresql://database/ships',
      SHIPS_N_CARGO_SQLITE_PATH: './ships.sqlite'
    })
  ).rejects.toThrow(EventJournalConfigurationInvalid)
})

test('migrates and verifies PostgreSQL before returning the application runtime', async () => {
  const { end, migrationQuery, pool, query, release } = fakePool()
  const { construct, PoolConstructor } = fakePoolConstructor(pool)

  const runtime = await createDefaultApplication(
    { SHIPS_N_CARGO_POSTGRESQL_URL: 'postgresql://database/ships' },
    PoolConstructor
  )

  expect(construct).toHaveBeenCalledWith({
    connectionString: 'postgresql://database/ships'
  })
  expect(migrationQuery).toHaveBeenCalledWith(
    expect.stringContaining('CREATE TABLE ships_n_cargo.event_journal')
  )
  expect(release).toHaveBeenCalledOnce()
  expect(query).toHaveBeenCalledTimes(2)
  expect(runtime.application).toBeDefined()
  await runtime.close()
  expect(end).toHaveBeenCalledOnce()
})

test('rejects an empty PostgreSQL connection string instead of falling back to memory', async () => {
  const { construct, PoolConstructor } = fakePoolConstructor(fakePool().pool)

  await expect(
    createDefaultApplication({ SHIPS_N_CARGO_POSTGRESQL_URL: '  ' }, PoolConstructor)
  ).rejects.toThrow(PostgreSqlConnectionStringInvalid)
  expect(construct).not.toHaveBeenCalled()
})

test('closes PostgreSQL and prevents startup when the schema is incompatible', async () => {
  const columnsWithoutPayload = compatibleColumns.filter(
    ({ column_name }) => column_name !== 'event_payload'
  )
  const { end, pool } = fakePool(columnsWithoutPayload)

  await expect(
    createDefaultApplication(
      { SHIPS_N_CARGO_POSTGRESQL_URL: 'postgresql://database/ships' },
      fakePoolConstructor(pool).PoolConstructor
    )
  ).rejects.toThrow(EventJournalSchemaIncompatible)
  expect(end).toHaveBeenCalledOnce()
})

test('preserves the startup failure when closing the rejected PostgreSQL pool also fails', async () => {
  const connectionFailure = new Error('database unavailable')
  const migrationClient = {
    query: vi.fn().mockRejectedValue(connectionFailure),
    release: vi.fn()
  }
  const pool = {
    connect: vi.fn().mockResolvedValue(migrationClient),
    query: vi.fn(),
    end: vi.fn().mockRejectedValue(new Error('close failed'))
  } as unknown as Pool

  await expect(
    createDefaultApplication(
      { SHIPS_N_CARGO_POSTGRESQL_URL: 'postgresql://database/ships' },
      fakePoolConstructor(pool).PoolConstructor
    )
  ).rejects.toBe(connectionFailure)
})
