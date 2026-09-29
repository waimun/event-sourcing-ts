import { readFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'

interface MigrationRow {
  version: number
}

const migrations = [
  {
    version: 1,
    source: new URL('./schema/001-event-journal.sql', import.meta.url)
  }
] as const

export const migrateEventJournalSchema = (database: DatabaseSync): void => {
  database.exec('BEGIN IMMEDIATE')

  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS event_journal_migrations (
        version INTEGER PRIMARY KEY
      ) STRICT;
    `)
    const rows = database
      .prepare('SELECT version FROM event_journal_migrations ORDER BY version ASC')
      .all() as unknown as MigrationRow[]
    const appliedVersions = new Set(rows.map(({ version }) => version))

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) continue

      database.exec(readFileSync(migration.source, 'utf8'))
      database
        .prepare('INSERT INTO event_journal_migrations (version) VALUES (?)')
        .run(migration.version)
    }

    database.exec('COMMIT')
  } catch (error) {
    try {
      database.exec('ROLLBACK')
    } catch {
      // Preserve the migration failure when the database cannot roll back.
    }
    throw error
  }
}
