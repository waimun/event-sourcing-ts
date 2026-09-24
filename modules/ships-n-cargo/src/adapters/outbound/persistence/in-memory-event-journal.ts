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

export class InMemoryEventJournal implements EventJournal<string, DomainEvent> {
  readonly name: string
  private readonly entries: Map<string, readonly string[]>

  constructor(name: Name) {
    this.name = name.value
    this.entries = new Map<string, readonly string[]>()
  }

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)

    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const current = this.entries.get(id) ?? []
    if (current.length !== expectedVersion)
      throw new JournalVersionConflict(id, expectedVersion, current.length)

    const serialized = events.map((event) =>
      eventPayloadHandler.byType(event.type).eventToJson(event)
    )
    this.entries.set(id, Object.freeze([...current, ...serialized]))
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    const serialized = this.entries.get(id) ?? []
    const events = Object.freeze(
      serialized.map((payload) => {
        const parsed: unknown = JSON.parse(payload)
        const type =
          typeof parsed === 'object' && parsed !== null && 'type' in parsed
            ? parsed.type
            : undefined
        return eventPayloadHandler.byType(String(type)).eventFromJson(payload)
      })
    )
    return Object.freeze({ events, version: events.length })
  }
}
