import { Pool } from 'pg'
import { migrateEventJournalSchema } from '../../src/adapters/outbound/persistence/postgresql/event-journal-migrations'
import { formatDatabaseSetupFailure } from '../../src/bootstrap/startup-failure'

const connectionString = process.env.SHIPS_N_CARGO_POSTGRESQL_URL

if (connectionString === undefined || connectionString.trim() === '') {
  console.error('SHIPS_N_CARGO_POSTGRESQL_URL must contain a PostgreSQL connection string')
  process.exitCode = 1
} else {
  const pool = new Pool({ connectionString })
  try {
    await migrateEventJournalSchema(pool)
    console.log('ships_n_cargo.event_journal is ready')
  } catch (error) {
    console.error(formatDatabaseSetupFailure(error))
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
