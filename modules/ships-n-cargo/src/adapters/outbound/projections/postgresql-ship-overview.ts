import type { Pool, PoolClient, QueryResultRow } from 'pg'
import type { PositionedEvent } from '../../../application/ports/event-journal'
import type {
  ShipOverview,
  ShipOverviewFilter,
  ShipOverviewProjection,
  ShipOverviewProjectionBatch,
  ShipOverviewQueries,
  ShipOverviewStatus
} from '../../../application/ports/ship-overview-projection'
import { eventPayloadHandler } from '../../../domain/events'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { BaseError } from '../../../shared/errors/kernel'
import { validateGlobalFeedRead } from '../persistence/errors/event-journal'
import { ShipOverviewProjectionUnavailable } from './errors/ship-overview'
import { applyShipOverviewEvent } from './ship-overview'

interface CheckpointRow extends QueryResultRow {
  position: string
}

interface EventRow extends QueryResultRow {
  aggregate_id: string
  event_payload: string
  global_position: string
  version: string
}

interface OverviewRow extends QueryResultRow {
  current_port_country: string | null
  current_port_name: string | null
  name: string
  ship_id: string
  status: ShipOverviewStatus
}

const rollback = async (client: PoolClient): Promise<void> => {
  try {
    await client.query('ROLLBACK')
  } catch {
    // Preserve the projection failure when the connection cannot roll back.
  }
}

const overviewFrom = (row: OverviewRow): ShipOverview =>
  Object.freeze({
    ...(row.current_port_name === null || row.current_port_country === null
      ? {}
      : {
          currentPort: Object.freeze({
            country: row.current_port_country,
            name: row.current_port_name
          })
        }),
    name: row.name,
    shipId: row.ship_id,
    status: row.status
  })

const loadOverview = async (
  client: PoolClient,
  shipId: string
): Promise<ShipOverview | undefined> => {
  const result = await client.query<OverviewRow>(
    `SELECT ship_id, name, status, current_port_name, current_port_country
     FROM ships_n_cargo.ship_overview
     WHERE ship_id = $1`,
    [shipId]
  )
  return result.rows[0] === undefined ? undefined : overviewFrom(result.rows[0])
}

const storeOverview = async (client: PoolClient, overview: ShipOverview): Promise<void> => {
  await client.query(
    `INSERT INTO ships_n_cargo.ship_overview
       (ship_id, name, status, current_port_name, current_port_country)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (ship_id) DO UPDATE SET
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       current_port_name = EXCLUDED.current_port_name,
       current_port_country = EXCLUDED.current_port_country`,
    [
      overview.shipId,
      overview.name,
      overview.status,
      overview.currentPort?.name ?? null,
      overview.currentPort?.country ?? null
    ]
  )
}

export class PostgreSqlShipOverviewProjection
  implements ShipOverviewProjection, ShipOverviewQueries
{
  constructor(private readonly pool: Pool) {}

  async projectNextBatch(batchSize: number): Promise<ShipOverviewProjectionBatch> {
    validateGlobalFeedRead(0n, batchSize)

    let client: PoolClient
    try {
      client = await this.pool.connect()
    } catch (error) {
      throw new ShipOverviewProjectionUnavailable(error)
    }

    try {
      await client.query('BEGIN')
      const checkpointResult = await client.query<CheckpointRow>(
        `SELECT checkpoint.position::text AS position
         FROM ships_n_cargo.ship_overview_checkpoint AS checkpoint
         WHERE checkpoint.singleton = TRUE
         FOR UPDATE`
      )
      const currentCheckpoint = BigInt(checkpointResult.rows[0].position)
      const eventResult = await client.query<EventRow>(
        `SELECT
           journal.aggregate_id,
           journal.version::text AS version,
           journal.global_position::text AS global_position,
           journal.event_payload
         FROM ships_n_cargo.event_journal AS journal
         WHERE journal.global_position > $1
         ORDER BY journal.global_position ASC
         LIMIT $2`,
        [currentCheckpoint.toString(), batchSize]
      )
      const entries: readonly PositionedEvent<string, DomainEvent>[] = eventResult.rows.map((row) =>
        Object.freeze({
          aggregateId: row.aggregate_id,
          event: eventPayloadHandler.deserialize(row.event_payload),
          position: BigInt(row.global_position),
          streamVersion: Number(row.version)
        })
      )
      const overviews = new Map<string, ShipOverview | undefined>()

      for (const entry of entries) {
        let current = overviews.get(entry.aggregateId)
        if (!overviews.has(entry.aggregateId)) {
          current = await loadOverview(client, entry.aggregateId)
        }
        const next = applyShipOverviewEvent(current, entry.event)
        await storeOverview(client, next)
        overviews.set(entry.aggregateId, next)
      }

      const checkpoint = entries.at(-1)?.position ?? currentCheckpoint
      if (entries.length > 0) {
        await client.query(
          `UPDATE ships_n_cargo.ship_overview_checkpoint
           SET position = $1
           WHERE singleton = TRUE`,
          [checkpoint.toString()]
        )
      }
      await client.query('COMMIT')
      return Object.freeze({ checkpoint, projectedEventCount: entries.length })
    } catch (error) {
      await rollback(client)
      if (error instanceof BaseError) throw error
      throw new ShipOverviewProjectionUnavailable(error)
    } finally {
      client.release()
    }
  }

  async overviewFor(shipId: string): Promise<ShipOverview | undefined> {
    try {
      const result = await this.pool.query<OverviewRow>(
        `SELECT ship_id, name, status, current_port_name, current_port_country
         FROM ships_n_cargo.ship_overview
         WHERE ship_id = $1`,
        [shipId]
      )
      return result.rows[0] === undefined ? undefined : overviewFrom(result.rows[0])
    } catch (error) {
      throw new ShipOverviewProjectionUnavailable(error)
    }
  }

  async overviewsMatching(filter: ShipOverviewFilter): Promise<readonly ShipOverview[]> {
    try {
      const result =
        'status' in filter
          ? await this.pool.query<OverviewRow>(
              `SELECT ship_id, name, status, current_port_name, current_port_country
               FROM ships_n_cargo.ship_overview
               WHERE status = $1
               ORDER BY ship_id ASC`,
              [filter.status]
            )
          : await this.pool.query<OverviewRow>(
              `SELECT ship_id, name, status, current_port_name, current_port_country
               FROM ships_n_cargo.ship_overview
               WHERE current_port_name = $1 AND current_port_country = $2
               ORDER BY ship_id ASC`,
              [filter.currentPort.name, filter.currentPort.country]
            )
      return Object.freeze(result.rows.map(overviewFrom))
    } catch (error) {
      throw new ShipOverviewProjectionUnavailable(error)
    }
  }
}
