import type { Pool, PoolClient, QueryResultRow } from 'pg'
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
import { EVENT_JOURNAL_CONSTRAINTS } from './event-journal-schema'

interface EventRow extends QueryResultRow {
  event_payload: string
  version: string
}

interface VersionRow extends QueryResultRow {
  version: string
}

interface PostgreSqlError {
  code?: unknown
  constraint?: unknown
}

const isStreamPositionConflict = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as PostgreSqlError
  return (
    candidate.code === '23505' && candidate.constraint === EVENT_JOURNAL_CONSTRAINTS.streamPosition
  )
}

const deserialize = (eventPayload: string): DomainEvent => {
  const parsed: unknown = JSON.parse(eventPayload)
  const type =
    typeof parsed === 'object' && parsed !== null && 'type' in parsed ? parsed.type : undefined
  return eventPayloadHandler.byType(String(type)).eventFromJson(eventPayload)
}

const currentVersion = async (
  client: Pick<Pool, 'query'>,
  aggregateId: string
): Promise<number> => {
  const result = await client.query<VersionRow>(
    `SELECT version::text
     FROM ships_n_cargo.event_journal
     WHERE aggregate_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [aggregateId]
  )
  return result.rows.length === 0 ? 0 : Number(result.rows[0].version)
}

const rollback = async (client: PoolClient): Promise<void> => {
  try {
    await client.query('ROLLBACK')
  } catch {
    // Preserve the operation's original failure; a broken connection cannot be recovered here.
  }
}

export class PostgreSqlEventJournal implements EventJournal<string, DomainEvent> {
  constructor(private readonly pool: Pool) {}

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)
    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const serializedEvents = events.map((event) =>
      eventPayloadHandler.byType(event.type).eventToJson(event)
    )

    let client: PoolClient
    try {
      client = await this.pool.connect()
    } catch (error) {
      throw new EventJournalUnavailable('append', error)
    }

    try {
      await client.query('BEGIN')
      const actualVersion = await currentVersion(client, id)
      if (actualVersion !== expectedVersion) {
        throw new JournalVersionConflict(id, expectedVersion, actualVersion)
      }

      const values: unknown[] = []
      const placeholders = serializedEvents.map((eventPayload, index) => {
        const parameter = index * 3
        values.push(id, expectedVersion + index + 1, eventPayload)
        return `($${parameter + 1}, $${parameter + 2}, $${parameter + 3})`
      })
      await client.query(
        `INSERT INTO ships_n_cargo.event_journal (aggregate_id, version, event_payload)
         VALUES ${placeholders.join(', ')}`,
        values
      )
      await client.query('COMMIT')
    } catch (error) {
      await rollback(client)

      if (error instanceof JournalVersionConflict) throw error

      if (isStreamPositionConflict(error)) {
        try {
          const actualVersion = await currentVersion(this.pool, id)
          throw new JournalVersionConflict(id, expectedVersion, actualVersion)
        } catch (versionError) {
          if (versionError instanceof JournalVersionConflict) throw versionError
          throw new EventJournalUnavailable('append', versionError)
        }
      }

      throw new EventJournalUnavailable('append', error)
    } finally {
      client.release()
    }
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    let rows: EventRow[]
    try {
      const result = await this.pool.query<EventRow>(
        `SELECT version::text, event_payload
         FROM ships_n_cargo.event_journal
         WHERE aggregate_id = $1
         ORDER BY version ASC`,
        [id]
      )
      rows = result.rows
    } catch (error) {
      throw new EventJournalUnavailable('eventsByAggregate', error)
    }

    const events = Object.freeze(rows.map(({ event_payload }) => deserialize(event_payload)))
    const version = rows.length === 0 ? 0 : Number(rows[rows.length - 1].version)
    return Object.freeze({ events, version })
  }
}
