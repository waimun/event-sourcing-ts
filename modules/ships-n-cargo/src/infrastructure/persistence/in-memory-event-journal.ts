import { EventJournal } from '../../domain/events/event-journal'
import { DomainEvent } from '../../domain/events/domain-event'

export class InMemoryEventJournal implements EventJournal<string, DomainEvent> {
  readonly name: string
  readonly entries: Map<string, DomainEvent[]>

  constructor (name: string) {
    this.name = name
    this.entries = new Map<string, DomainEvent[]>()
  }

  newEntry (id: string, ...events: DomainEvent[]): void {
    if (events.length === 0) throw new EventIsRequired()
    if (this.entries.has(id)) throw new EntryAlreadyExists(id)

    this.entries.set(id, events)
  }

  appendEvents (id: string, ...events: DomainEvent[]): void {
    if (events.length === 0) throw new EventIsRequired()
    if (!this.entries.has(id)) throw new EntryDoesNotExist(id)

    this.entries.get(id)?.push(...events)
  }

  eventsById (id: string): DomainEvent[] {
    return this.entries.get(id) ?? []
  }
}

export class EntryAlreadyExists extends Error {
  constructor (id: string) {
    super(`Entry id '${id}' already exists in the journal`)
  }
}

export class EntryDoesNotExist extends Error {
  constructor (id: string) {
    super(`Entry id '${id}' does not exist in the journal`)
  }
}

export class EventIsRequired extends Error {
  constructor () {
    super('At least one event is required to create a new entry or append to an existing entry')
  }
}
