import { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import type {
  EventJournal,
  EventStream,
  GlobalEventFeed,
  GlobalPosition,
  PositionedEvent
} from '../../../application/ports/event-journal'
import { eventPayloadHandler } from '../../../domain/events'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Name } from '../../../shared/domain/name'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion,
  validateGlobalFeedRead
} from './errors/event-journal'

interface StoredEvent {
  readonly aggregateId: string
  readonly payload: string
  readonly position: GlobalPosition
  readonly streamVersion: number
}

export class InMemoryEventJournal
  implements EventJournal<string, DomainEvent>, GlobalEventFeed<string, DomainEvent>
{
  readonly name: string
  private readonly entries: Map<string, readonly StoredEvent[]>
  private globalEntries: readonly StoredEvent[]
  private nextPosition: GlobalPosition

  constructor(name: Name) {
    this.name = name.value
    this.entries = new Map<string, readonly StoredEvent[]>()
    this.globalEntries = Object.freeze([])
    this.nextPosition = 1n
  }

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)

    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const current = this.entries.get(id) ?? []
    if (current.length !== expectedVersion)
      throw new JournalVersionConflict(id, expectedVersion, current.length)

    const stored = events.map((event, index) =>
      Object.freeze({
        aggregateId: id,
        payload: eventPayloadHandler.serialize(event),
        position: this.nextPosition + BigInt(index),
        streamVersion: expectedVersion + index + 1
      })
    )
    this.entries.set(id, Object.freeze([...current, ...stored]))
    this.globalEntries = Object.freeze([...this.globalEntries, ...stored])
    this.nextPosition += BigInt(stored.length)
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    const stored = this.entries.get(id) ?? []
    const events = Object.freeze(
      stored.map(({ payload }) => eventPayloadHandler.deserialize(payload))
    )
    return Object.freeze({ events, version: events.length })
  }

  async globalEventsAfter(
    position: GlobalPosition,
    batchSize: number
  ): Promise<readonly PositionedEvent<string, DomainEvent>[]> {
    validateGlobalFeedRead(position, batchSize)
    return Object.freeze(
      this.globalEntries
        .filter((entry) => entry.position > position)
        .slice(0, batchSize)
        .map((entry) =>
          Object.freeze({
            aggregateId: entry.aggregateId,
            event: eventPayloadHandler.deserialize(entry.payload),
            position: entry.position,
            streamVersion: entry.streamVersion
          })
        )
    )
  }

  async globalHeadPosition(): Promise<GlobalPosition> {
    return this.nextPosition - 1n
  }
}
