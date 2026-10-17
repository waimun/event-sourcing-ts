import type { DomainEvent } from '../../domain/events/domain-event'
import type { Name } from '../../shared/domain/name'
import { JournalVersionConflict } from '../errors/journal-version-conflict'
import type { EventJournal, EventStream } from '../ports/event-journal'

export class InMemoryEventJournal implements EventJournal<string, DomainEvent> {
  readonly name: string
  private readonly entries = new Map<string, readonly DomainEvent[]>()

  constructor(name: Name) {
    this.name = name.value
  }

  async append(id: string, expectedVersion: number, events: readonly DomainEvent[]): Promise<void> {
    const current = this.entries.get(id) ?? []
    if (current.length !== expectedVersion) {
      throw new JournalVersionConflict(id, expectedVersion, current.length)
    }

    this.entries.set(id, Object.freeze([...current, ...events]))
  }

  async eventsByAggregate(id: string): Promise<EventStream<DomainEvent>> {
    const events = this.entries.get(id) ?? []
    return Object.freeze({ events, version: events.length })
  }
}
