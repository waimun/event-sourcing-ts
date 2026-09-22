import { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import type { EventJournal, EventStream } from '../../../application/ports/event-journal'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { Name } from '../../../shared/domain/name'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion
} from './errors/event-journal'

export class InMemoryEventJournal implements EventJournal<string, DomainEvent> {
  readonly name: string
  private readonly entries: Map<string, DomainEvent[]>

  constructor(name: Name) {
    this.name = name.value
    this.entries = new Map<string, DomainEvent[]>()
  }

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new InvalidExpectedVersion(expectedVersion)

    if (events.some((event) => event.aggregateId !== id)) throw new AggregateIdMismatch(id)

    const current = this.entries.get(id) ?? []
    if (current.length !== expectedVersion)
      throw new JournalVersionConflict(id, expectedVersion, current.length)

    this.entries.set(id, [...current, ...events])
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    const events = this.entries.get(id) ?? []
    return { events: [...events], version: events.length }
  }
}
