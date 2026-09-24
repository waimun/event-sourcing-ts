import { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import type { EventJournal, EventStream } from '../../../application/ports/event-journal'
import { eventPayloadHandler } from '../../../domain/events'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Name } from '../../../shared/domain/name'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion
} from './errors/event-journal'

interface StoredEvent {
  readonly type: string
  readonly payload: string
}

export class InMemoryEventJournal implements EventJournal<string, DomainEvent> {
  readonly name: string
  private readonly entries: Map<string, readonly StoredEvent[]>

  constructor(name: Name) {
    this.name = name.value
    this.entries = new Map<string, readonly StoredEvent[]>()
  }

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)

    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const current = this.entries.get(id) ?? []
    if (current.length !== expectedVersion)
      throw new JournalVersionConflict(id, expectedVersion, current.length)

    const stored = events.map((event) =>
      Object.freeze({
        type: event.type,
        payload: eventPayloadHandler.byType(event.type).eventToJson(event)
      })
    )
    this.entries.set(id, Object.freeze([...current, ...stored]))
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    const stored = this.entries.get(id) ?? []
    const events = Object.freeze(
      stored.map(({ type, payload }) => eventPayloadHandler.byType(type).eventFromJson(payload))
    )
    return Object.freeze({ events, version: events.length })
  }
}
