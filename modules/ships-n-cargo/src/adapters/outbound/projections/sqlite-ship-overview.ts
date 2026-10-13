import { DatabaseSync } from 'node:sqlite'
import type { PositionedEvent } from '../../../application/ports/event-journal'
import type {
  ShipOverview,
  ShipOverviewProjection,
  ShipOverviewProjectionBatch,
  ShipOverviewStatus
} from '../../../application/ports/ship-overview-projection'
import { eventPayloadHandler } from '../../../domain/events'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { BaseError } from '../../../shared/errors/kernel'
import { validateGlobalFeedRead } from '../persistence/errors/event-journal'
import { migrateEventJournalSchema } from '../persistence/sqlite/event-journal-migrations'
import { ShipOverviewProjectionUnavailable } from './errors/ship-overview'
import { applyShipOverviewEvent } from './ship-overview'

interface CheckpointRow {
  position: string
}

interface EventRow {
  aggregate_id: string
  event_payload: string
  global_position: string
  version: string
}

interface OverviewRow {
  current_port_country: string | null
  current_port_name: string | null
  name: string
  ship_id: string
  status: ShipOverviewStatus
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

export class SqliteShipOverviewProjection implements ShipOverviewProjection {
  private readonly database: DatabaseSync

  constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath, { timeout: 5_000 })
    try {
      this.database.exec('PRAGMA journal_mode = WAL')
      migrateEventJournalSchema(this.database)
    } catch (error) {
      this.database.close()
      throw error
    }
  }

  async projectNextBatch(batchSize: number): Promise<ShipOverviewProjectionBatch> {
    validateGlobalFeedRead(0n, batchSize)
    let transactionStarted = false

    try {
      this.database.exec('BEGIN IMMEDIATE')
      transactionStarted = true
      const checkpointRow = this.database
        .prepare(
          `SELECT CAST(position AS TEXT) AS position
           FROM ship_overview_checkpoint
           WHERE singleton = 1`
        )
        .get() as unknown as CheckpointRow
      const currentCheckpoint = BigInt(checkpointRow.position)
      const rows = this.database
        .prepare(
          `SELECT
             aggregate_id,
             CAST(version AS TEXT) AS version,
             CAST(global_position AS TEXT) AS global_position,
             event_payload
           FROM event_journal AS journal
           WHERE journal.global_position > ?
           ORDER BY journal.global_position ASC
           LIMIT ?`
        )
        .all(currentCheckpoint, batchSize) as unknown as EventRow[]
      const entries: readonly PositionedEvent<string, DomainEvent>[] = rows.map((row) =>
        Object.freeze({
          aggregateId: row.aggregate_id,
          event: eventPayloadHandler.deserialize(row.event_payload),
          position: BigInt(row.global_position),
          streamVersion: Number(row.version)
        })
      )
      const overviews = new Map<string, ShipOverview | undefined>()
      const selectOverview = this.database.prepare(
        `SELECT ship_id, name, status, current_port_name, current_port_country
         FROM ship_overview
         WHERE ship_id = ?`
      )
      const storeOverview = this.database.prepare(
        `INSERT INTO ship_overview
           (ship_id, name, status, current_port_name, current_port_country)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (ship_id) DO UPDATE SET
           name = excluded.name,
           status = excluded.status,
           current_port_name = excluded.current_port_name,
           current_port_country = excluded.current_port_country`
      )

      for (const entry of entries) {
        let current = overviews.get(entry.aggregateId)
        if (!overviews.has(entry.aggregateId)) {
          const row = selectOverview.get(entry.aggregateId) as unknown as OverviewRow | undefined
          current = row === undefined ? undefined : overviewFrom(row)
        }
        const next = applyShipOverviewEvent(current, entry.event)
        storeOverview.run(
          next.shipId,
          next.name,
          next.status,
          next.currentPort?.name ?? null,
          next.currentPort?.country ?? null
        )
        overviews.set(entry.aggregateId, next)
      }

      const checkpoint = entries.at(-1)?.position ?? currentCheckpoint
      if (entries.length > 0) {
        this.database
          .prepare('UPDATE ship_overview_checkpoint SET position = ? WHERE singleton = 1')
          .run(checkpoint)
      }
      this.database.exec('COMMIT')
      return Object.freeze({ checkpoint, projectedEventCount: entries.length })
    } catch (error) {
      if (transactionStarted) {
        try {
          this.database.exec('ROLLBACK')
        } catch {
          // Preserve the projection failure when the database cannot roll back.
        }
      }
      if (error instanceof BaseError) throw error
      throw new ShipOverviewProjectionUnavailable(error)
    }
  }

  close(): void {
    if (this.database.isOpen) this.database.close()
  }
}
