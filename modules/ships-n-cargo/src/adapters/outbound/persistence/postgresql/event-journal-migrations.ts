import { readFile } from 'node:fs/promises'
import type { Pool, PoolClient, QueryResultRow } from 'pg'
import { pendingMigrations } from '../migration-versions'

interface MigrationRow extends QueryResultRow {
  version: number
}

const migrations = [
  {
    version: 1,
    source: new URL('./schema/001-event-journal.sql', import.meta.url)
  }
] as const

const rollback = async (client: PoolClient): Promise<void> => {
  try {
    await client.query('ROLLBACK')
  } catch {
    // Preserve the migration failure when the connection cannot roll back.
  }
}

export const migrateEventJournalSchema = async (pool: Pool): Promise<void> => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('CREATE SCHEMA IF NOT EXISTS ships_n_cargo')
    await client.query(`
      CREATE TABLE IF NOT EXISTS ships_n_cargo.event_journal_migrations (
        version INTEGER PRIMARY KEY
      )
    `)
    await client.query('LOCK TABLE ships_n_cargo.event_journal_migrations IN ACCESS EXCLUSIVE MODE')

    const result = await client.query<MigrationRow>(`
      SELECT version
      FROM ships_n_cargo.event_journal_migrations
      ORDER BY version ASC
    `)
    const appliedVersions = result.rows.map(({ version }) => version)

    for (const migration of pendingMigrations('PostgreSQL', migrations, appliedVersions)) {
      const sql = await readFile(migration.source, 'utf8')
      await client.query(sql)
      await client.query(
        'INSERT INTO ships_n_cargo.event_journal_migrations (version) VALUES ($1)',
        [migration.version]
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await rollback(client)
    throw error
  } finally {
    client.release()
  }
}
