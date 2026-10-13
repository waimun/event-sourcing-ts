import { DatabaseSync } from 'node:sqlite'
import { JournalVersionConflict } from '../../../../application/errors/journal-version-conflict'
import { EventJournalUnavailable } from '../../../../application/ports/errors/event-journal-unavailable'
import type {
  EventJournal,
  EventStream,
  GlobalEventFeed,
  GlobalPosition,
  PositionedEvent
} from '../../../../application/ports/event-journal'
import { eventPayloadHandler } from '../../../../domain/events'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion,
  validateGlobalFeedRead
} from '../errors/event-journal'
import { migrateEventJournalSchema } from './event-journal-migrations'

interface EventRow {
  event_payload: string
  version: number
}

interface VersionRow {
  version: number
}

interface PositionRow {
  position: string
}

interface GlobalEventRow {
  aggregate_id: string
  event_payload: string
  global_position: string
  version: string
}

export class SqliteEventJournal
  implements EventJournal<string, DomainEvent>, GlobalEventFeed<string, DomainEvent>
{
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

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)
    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const serializedEvents = events.map((event) => eventPayloadHandler.serialize(event))
    let transactionStarted = false

    try {
      this.database.exec('BEGIN IMMEDIATE')
      transactionStarted = true

      const row = this.database
        .prepare(
          'SELECT COALESCE(MAX(version), 0) AS version FROM event_journal WHERE aggregate_id = ?'
        )
        .get(id) as unknown as VersionRow
      if (row.version !== expectedVersion) {
        throw new JournalVersionConflict(id, expectedVersion, row.version)
      }

      const positionRow = this.database
        .prepare(
          'SELECT CAST(next_position AS TEXT) AS position FROM event_journal_position WHERE singleton = 1'
        )
        .get() as unknown as PositionRow
      const firstPosition = BigInt(positionRow.position)
      this.database
        .prepare('UPDATE event_journal_position SET next_position = next_position + ?')
        .run(BigInt(events.length))

      const insert = this.database.prepare(
        `INSERT INTO event_journal
           (aggregate_id, version, global_position, event_payload)
         VALUES (?, ?, ?, ?)`
      )
      serializedEvents.forEach((eventPayload, index) => {
        insert.run(id, expectedVersion + index + 1, firstPosition + BigInt(index), eventPayload)
      })
      this.database.exec('COMMIT')
    } catch (error) {
      if (transactionStarted) {
        try {
          this.database.exec('ROLLBACK')
        } catch {
          // Preserve the operation's original failure when the database cannot roll back.
        }
      }
      if (error instanceof JournalVersionConflict) throw error
      throw new EventJournalUnavailable('append', error)
    }
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    let rows: EventRow[]
    try {
      rows = this.database
        .prepare(
          `SELECT version, event_payload
           FROM event_journal
           WHERE aggregate_id = ?
           ORDER BY version ASC`
        )
        .all(id) as unknown as EventRow[]
    } catch (error) {
      throw new EventJournalUnavailable('eventsByAggregate', error)
    }

    const events = Object.freeze(
      rows.map(({ event_payload }) => eventPayloadHandler.deserialize(event_payload))
    )
    const version = rows.length === 0 ? 0 : rows[rows.length - 1].version
    return Object.freeze({ events, version })
  }

  async globalEventsAfter(
    position: GlobalPosition,
    batchSize: number
  ): Promise<readonly PositionedEvent<string, DomainEvent>[]> {
    validateGlobalFeedRead(position, batchSize)

    let rows: GlobalEventRow[]
    try {
      rows = this.database
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
        .all(position, batchSize) as unknown as GlobalEventRow[]
    } catch (error) {
      throw new EventJournalUnavailable('globalEventsAfter', error)
    }

    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          aggregateId: row.aggregate_id,
          event: eventPayloadHandler.deserialize(row.event_payload),
          position: BigInt(row.global_position),
          streamVersion: Number(row.version)
        })
      )
    )
  }

  async globalHeadPosition(): Promise<GlobalPosition> {
    let row: PositionRow
    try {
      row = this.database
        .prepare('SELECT CAST(next_position - 1 AS TEXT) AS position FROM event_journal_position')
        .get() as unknown as PositionRow
    } catch (error) {
      throw new EventJournalUnavailable('globalHeadPosition', error)
    }
    return BigInt(row.position)
  }

  close(): void {
    if (this.database.isOpen) this.database.close()
  }
}
