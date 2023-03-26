import { EventJournal } from '../../domain/events/event-journal'
import { DomainEvent } from '../../domain/events/domain-event'
import { Name } from '../../shared/domain/name'

export class InMemoryEventJournal implements EventJournal<string, DomainEvent> {
  readonly name: string
  readonly entries: Map<string, DomainEvent[]>

  constructor (name: Name) {
    this.name = name.value
    this.entries = new Map<string, DomainEvent[]>()
  }

  async append (...events: DomainEvent[]): Promise<void> {
    if (events.length === 0) throw new EventIsRequired()

    events.forEach(event => {
      if (this.entries.has(event.aggregateId)) {
        this.entries.get(event.aggregateId)?.push(event)
      } else {
        this.entries.set(event.aggregateId, [event])
      }
    })
  }

  async eventsByAggregate (id: string): Promise<DomainEvent[]> {
    return this.entries.get(id) ?? []
  }
}

export class EventIsRequired extends Error {
  constructor () {
    super('At least one event is required to create a new entry or append to an existing entry')
  }
}
