import { DatabaseSync } from 'node:sqlite'
import { JournalVersionConflict } from '../../../../application/errors/journal-version-conflict'
import { EventJournalUnavailable } from '../../../../application/ports/errors/event-journal-unavailable'
import type { EventJournal, EventStream } from '../../../../application/ports/event-journal'
import { eventPayloadHandler } from '../../../../domain/events'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion
} from '../errors/event-journal'

interface EventRow {
  event_payload: string
  version: number
}

interface VersionRow {
  version: number
}

export class SqliteEventJournal implements EventJournal<string, DomainEvent> {
  private readonly database: DatabaseSync

  constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath, { timeout: 5_000 })
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS event_journal (
        aggregate_id TEXT NOT NULL,
        version INTEGER NOT NULL CHECK (version > 0),
        event_payload TEXT NOT NULL,
        PRIMARY KEY (aggregate_id, version)
      ) STRICT;
    `)
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

      const insert = this.database.prepare(
        'INSERT INTO event_journal (aggregate_id, version, event_payload) VALUES (?, ?, ?)'
      )
      serializedEvents.forEach((eventPayload, index) => {
        insert.run(id, expectedVersion + index + 1, eventPayload)
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

  close(): void {
    if (this.database.isOpen) this.database.close()
  }
}
