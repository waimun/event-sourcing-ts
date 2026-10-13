import type { Pool, PoolClient, QueryResultRow } from 'pg'
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
import { EVENT_JOURNAL_CONSTRAINTS } from './event-journal-schema'

interface EventRow extends QueryResultRow {
  event_payload: string
  version: string
}

interface VersionRow extends QueryResultRow {
  version: string
}

interface PositionRow extends QueryResultRow {
  position: string
}

interface GlobalEventRow extends EventRow {
  aggregate_id: string
  global_position: string
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

const currentVersion = async (
  client: Pick<Pool, 'query'>,
  aggregateId: string
): Promise<number> => {
  const result = await client.query<VersionRow>(
    `SELECT journal.version::text AS version
     FROM ships_n_cargo.event_journal AS journal
     WHERE journal.aggregate_id = $1
     ORDER BY journal.version DESC
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

export class PostgreSqlEventJournal
  implements EventJournal<string, DomainEvent>, GlobalEventFeed<string, DomainEvent>
{
  constructor(private readonly pool: Pool) {}

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)
    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const serializedEvents = events.map((event) => eventPayloadHandler.serialize(event))

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

      const positionResult = await client.query<PositionRow>(
        `UPDATE ships_n_cargo.event_journal_position AS position
         SET next_position = position.next_position + $1
         RETURNING (position.next_position - $1)::text AS position`,
        [events.length]
      )
      const firstPosition = BigInt(positionResult.rows[0].position)

      const values: unknown[] = []
      const placeholders = serializedEvents.map((eventPayload, index) => {
        const parameter = index * 4
        values.push(
          id,
          expectedVersion + index + 1,
          (firstPosition + BigInt(index)).toString(),
          eventPayload
        )
        return `($${parameter + 1}, $${parameter + 2}, $${parameter + 3}, $${parameter + 4})`
      })
      await client.query(
        `INSERT INTO ships_n_cargo.event_journal
           (aggregate_id, version, global_position, event_payload)
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
        `SELECT journal.version::text AS version, journal.event_payload
         FROM ships_n_cargo.event_journal AS journal
         WHERE journal.aggregate_id = $1
         ORDER BY journal.version ASC`,
        [id]
      )
      rows = result.rows
    } catch (error) {
      throw new EventJournalUnavailable('eventsByAggregate', error)
    }

    const events = Object.freeze(
      rows.map(({ event_payload }) => eventPayloadHandler.deserialize(event_payload))
    )
    const version = rows.length === 0 ? 0 : Number(rows[rows.length - 1].version)
    return Object.freeze({ events, version })
  }

  async globalEventsAfter(
    position: GlobalPosition,
    batchSize: number
  ): Promise<readonly PositionedEvent<string, DomainEvent>[]> {
    validateGlobalFeedRead(position, batchSize)

    let rows: GlobalEventRow[]
    try {
      const result = await this.pool.query<GlobalEventRow>(
        `SELECT
           journal.aggregate_id,
           journal.version::text AS version,
           journal.global_position::text AS global_position,
           journal.event_payload
         FROM ships_n_cargo.event_journal AS journal
         WHERE journal.global_position > $1
         ORDER BY journal.global_position ASC
         LIMIT $2`,
        [position.toString(), batchSize]
      )
      rows = result.rows
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
      const result = await this.pool.query<PositionRow>(
        `SELECT (position.next_position - 1)::text AS position
         FROM ships_n_cargo.event_journal_position AS position`
      )
      row = result.rows[0]
    } catch (error) {
      throw new EventJournalUnavailable('globalHeadPosition', error)
    }
    return BigInt(row.position)
  }
}
