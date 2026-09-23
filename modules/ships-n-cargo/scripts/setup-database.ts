import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { verifyEventJournalSchema } from '../src/adapters/outbound/persistence/postgresql-event-journal-schema'

const connectionString = process.env.SHIPS_N_CARGO_DATABASE_URL

if (connectionString === undefined || connectionString.trim() === '') {
  console.error('SHIPS_N_CARGO_DATABASE_URL must contain a PostgreSQL connection string')
  process.exitCode = 1
} else {
  const pool = new Pool({ connectionString })
  try {
    const sqlPath = fileURLToPath(new URL('../sql/001-event-journal.sql', import.meta.url))
    const sql = await readFile(sqlPath, 'utf8')
    await pool.query(sql)
    await verifyEventJournalSchema(pool)
    console.log('ships_n_cargo.event_journal is ready')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Database setup failed: ${message}`)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
