import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Pool, QueryResult, QueryResultRow } from 'pg'
import { expect, test, vi } from 'vitest'
import { EventJournalSchemaIncompatible } from '../adapters/outbound/persistence/errors/event-journal'
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

const fakePool = (appliedVersions: number[] = []) => {
  const query = vi.fn()
  const migrationQuery = vi
    .fn()
    .mockImplementation((sql: string) =>
      Promise.resolve(
        sql.includes('SELECT version')
          ? result(appliedVersions.map((version) => ({ version })))
          : result()
      )
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

const fakeProjectionLifecycle = (order?: string[]) => {
  const start = vi.fn()
  const stop = vi.fn(async () => {
    order?.push('projection stopped')
  })
  const projectionLifecycle = vi.fn(() => ({ start, stop }))
  return { projectionLifecycle, start, stop }
}

test('uses the in-memory journal by default without creating a PostgreSQL pool', async () => {
  const { construct, PoolConstructor } = fakePoolConstructor(fakePool().pool)
  const { projectionLifecycle, start, stop } = fakeProjectionLifecycle()

  const runtime = await createDefaultApplication({}, PoolConstructor, undefined, {
    projectionLifecycle
  })

  expect(runtime.application).toBeDefined()
  expect(construct).not.toHaveBeenCalled()
  const reportFailure = vi.fn()
  runtime.start(reportFailure)
  expect(start).toHaveBeenCalledWith(reportFailure)
  await expect(runtime.close()).resolves.toBeUndefined()
  expect(stop).toHaveBeenCalledOnce()
})

test('stops and closes a file-backed SQLite projection before closing its journal', async () => {
  const { construct, PoolConstructor } = fakePoolConstructor(fakePool().pool)
  const order: string[] = []
  const close = vi.fn(() => order.push('journal closed'))
  const sqliteEventJournalFactory = vi.fn(() => ({
    append: vi.fn(),
    eventsByAggregate: vi.fn(),
    close
  })) as never
  const closeProjection = vi.fn(() => order.push('projection closed'))
  const sqliteShipOverviewProjection = vi.fn(() => ({
    close: closeProjection,
    overviewFor: vi.fn(),
    overviewsMatching: vi.fn(),
    projectNextBatch: vi.fn()
  }))
  const { projectionLifecycle, stop } = fakeProjectionLifecycle(order)

  const runtime = await createDefaultApplication(
    { SHIPS_N_CARGO_SQLITE_PATH: '  ./ships.sqlite  ' },
    PoolConstructor,
    sqliteEventJournalFactory,
    { projectionLifecycle, sqliteShipOverviewProjection }
  )

  expect(sqliteEventJournalFactory).toHaveBeenCalledWith('./ships.sqlite')
  expect(sqliteShipOverviewProjection).toHaveBeenCalledWith('./ships.sqlite')
  expect(construct).not.toHaveBeenCalled()
  expect(runtime.application).toBeDefined()
  await runtime.close()
  await runtime.close()
  expect(stop).toHaveBeenCalledOnce()
  expect(closeProjection).toHaveBeenCalledOnce()
  expect(close).toHaveBeenCalledOnce()
  expect(order).toEqual(['projection stopped', 'projection closed', 'journal closed'])
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

test('migrates PostgreSQL before returning the application runtime', async () => {
  const { end, migrationQuery, pool, query, release } = fakePool()
  const { construct, PoolConstructor } = fakePoolConstructor(pool)
  const { projectionLifecycle, stop } = fakeProjectionLifecycle()

  const runtime = await createDefaultApplication(
    { SHIPS_N_CARGO_POSTGRESQL_URL: 'postgresql://database/ships' },
    PoolConstructor,
    undefined,
    { projectionLifecycle }
  )

  expect(construct).toHaveBeenCalledWith({
    connectionString: 'postgresql://database/ships'
  })
  expect(migrationQuery).toHaveBeenCalledWith(
    expect.stringContaining('CREATE TABLE ships_n_cargo.event_journal')
  )
  expect(release).toHaveBeenCalledOnce()
  expect(query).not.toHaveBeenCalled()
  expect(runtime.application).toBeDefined()
  await runtime.close()
  expect(stop).toHaveBeenCalledOnce()
  expect(end).toHaveBeenCalledOnce()
})

test('closes a SQLite journal when its ship overview projection cannot be created', async () => {
  const projectionFailure = new Error('projection setup failed')
  const close = vi.fn()
  const { PoolConstructor } = fakePoolConstructor(fakePool().pool)
  const sqliteEventJournalFactory = vi.fn(() => ({
    append: vi.fn(),
    eventsByAggregate: vi.fn(),
    close
  })) as never

  await expect(
    createDefaultApplication(
      { SHIPS_N_CARGO_SQLITE_PATH: './ships.sqlite' },
      PoolConstructor,
      sqliteEventJournalFactory,
      {
        sqliteShipOverviewProjection: vi.fn(() => {
          throw projectionFailure
        })
      }
    )
  ).rejects.toBe(projectionFailure)
  expect(close).toHaveBeenCalledOnce()
})

test('rejects an empty PostgreSQL connection string instead of falling back to memory', async () => {
  const { construct, PoolConstructor } = fakePoolConstructor(fakePool().pool)

  await expect(
    createDefaultApplication({ SHIPS_N_CARGO_POSTGRESQL_URL: '  ' }, PoolConstructor)
  ).rejects.toThrow(PostgreSqlConnectionStringInvalid)
  expect(construct).not.toHaveBeenCalled()
})

test('closes PostgreSQL and prevents startup when migration versions are incompatible', async () => {
  const { end, pool } = fakePool([2])

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
