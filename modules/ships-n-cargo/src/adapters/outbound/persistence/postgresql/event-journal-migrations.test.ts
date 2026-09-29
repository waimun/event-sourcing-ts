import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'
import { expect, test, vi } from 'vitest'
import { migrateEventJournalSchema } from './event-journal-migrations'

const result = <TRow extends QueryResultRow>(rows: TRow[] = []): QueryResult<TRow> => ({
  command: '',
  rowCount: rows.length,
  oid: 0,
  fields: [],
  rows
})

const migrationClient = (appliedVersions: number[] = []) => {
  const query = vi
    .fn()
    .mockImplementation((sql: string) =>
      Promise.resolve(
        sql.includes('SELECT version')
          ? result(appliedVersions.map((version) => ({ version })))
          : result()
      )
    )
  const release = vi.fn()
  return { client: { query, release } as unknown as PoolClient, query, release }
}

const poolFor = (client: PoolClient): Pool =>
  ({ connect: vi.fn().mockResolvedValue(client) }) as unknown as Pool

test('applies the pending numbered migration and records its version', async () => {
  const { client, query, release } = migrationClient()

  await migrateEventJournalSchema(poolFor(client))

  expect(query).toHaveBeenNthCalledWith(1, 'BEGIN')
  expect(query).toHaveBeenCalledWith('CREATE SCHEMA IF NOT EXISTS ships_n_cargo')
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining('CREATE TABLE ships_n_cargo.event_journal')
  )
  expect(query).toHaveBeenCalledWith(
    'INSERT INTO ships_n_cargo.event_journal_migrations (version) VALUES ($1)',
    [1]
  )
  expect(query).toHaveBeenLastCalledWith('COMMIT')
  expect(release).toHaveBeenCalledOnce()
})

test('does not reapply an already recorded migration', async () => {
  const { client, query } = migrationClient([1])

  await migrateEventJournalSchema(poolFor(client))

  expect(query).not.toHaveBeenCalledWith(
    expect.stringContaining('CREATE TABLE ships_n_cargo.event_journal')
  )
  expect(query).not.toHaveBeenCalledWith(
    'INSERT INTO ships_n_cargo.event_journal_migrations (version) VALUES ($1)',
    expect.anything()
  )
  expect(query).toHaveBeenLastCalledWith('COMMIT')
})

test('rolls back a failed migration and releases the client', async () => {
  const failure = new Error('migration rejected')
  const { client, query, release } = migrationClient()
  query.mockImplementation((sql: string) => {
    if (sql.includes('SELECT version')) return Promise.resolve(result())
    if (sql.includes('CREATE TABLE ships_n_cargo.event_journal')) return Promise.reject(failure)
    return Promise.resolve(result())
  })

  await expect(migrateEventJournalSchema(poolFor(client))).rejects.toBe(failure)

  expect(query).toHaveBeenLastCalledWith('ROLLBACK')
  expect(release).toHaveBeenCalledOnce()
})

test('preserves the migration failure when rollback also fails', async () => {
  const failure = new Error('migration rejected')
  const { client, query } = migrationClient()
  query.mockImplementation((sql: string) => {
    if (sql.includes('SELECT version')) return Promise.resolve(result())
    if (sql.includes('CREATE TABLE ships_n_cargo.event_journal')) return Promise.reject(failure)
    if (sql === 'ROLLBACK') return Promise.reject(new Error('rollback rejected'))
    return Promise.resolve(result())
  })

  await expect(migrateEventJournalSchema(poolFor(client))).rejects.toBe(failure)
})
