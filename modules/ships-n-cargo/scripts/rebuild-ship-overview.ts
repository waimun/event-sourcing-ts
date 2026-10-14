/* v8 ignore file -- @preserve */
import { Pool } from 'pg'
import { migrateEventJournalSchema } from '../src/adapters/outbound/persistence/postgresql/event-journal-migrations'
import { PostgreSqlShipOverviewProjection } from '../src/adapters/outbound/projections/postgresql-ship-overview'
import { SqliteShipOverviewProjection } from '../src/adapters/outbound/projections/sqlite-ship-overview'
import { rebuildShipOverview } from '../src/application/rebuild-ship-overview'

const postgresqlUrl = process.env.SHIPS_N_CARGO_POSTGRESQL_URL?.trim()
const sqlitePath = process.env.SHIPS_N_CARGO_SQLITE_PATH?.trim()

const rebuildPostgreSql = async (connectionString: string): Promise<void> => {
  const pool = new Pool({ connectionString })
  try {
    await migrateEventJournalSchema(pool)
    const result = await rebuildShipOverview(new PostgreSqlShipOverviewProjection(pool))
    console.log(
      `Rebuilt the ship overview from ${result.projectedEventCount} events through global position ${result.checkpoint}`
    )
  } finally {
    await pool.end()
  }
}

const rebuildSqlite = async (databasePath: string): Promise<void> => {
  const projection = new SqliteShipOverviewProjection(databasePath)
  try {
    const result = await rebuildShipOverview(projection)
    console.log(
      `Rebuilt the ship overview from ${result.projectedEventCount} events through global position ${result.checkpoint}`
    )
  } finally {
    projection.close()
  }
}

try {
  if (
    postgresqlUrl !== undefined &&
    postgresqlUrl !== '' &&
    sqlitePath !== undefined &&
    sqlitePath !== ''
  ) {
    console.error(
      'Set exactly one of SHIPS_N_CARGO_POSTGRESQL_URL or SHIPS_N_CARGO_SQLITE_PATH before rebuilding the ship overview'
    )
    process.exitCode = 1
  } else if (postgresqlUrl !== undefined && postgresqlUrl !== '') {
    await rebuildPostgreSql(postgresqlUrl)
  } else if (sqlitePath !== undefined && sqlitePath !== '') {
    await rebuildSqlite(sqlitePath)
  } else {
    console.error(
      'Set SHIPS_N_CARGO_POSTGRESQL_URL or SHIPS_N_CARGO_SQLITE_PATH before rebuilding the ship overview'
    )
    process.exitCode = 1
  }
} catch (error) {
  console.error('Ship overview rebuild failed', error)
  process.exitCode = 1
}
