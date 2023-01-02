import { EventJournal } from '../domain/events/event-journal'
import { DomainEvent } from '../domain/events/domain-event'
import { InMemoryEventJournal } from '../infrastructure/persistence/in-memory-event-journal'
import { Name } from '../shared/domain/name'

export const eventDataStore: EventJournal<string, DomainEvent> = new InMemoryEventJournal(
  new Name('ships-n-cargo')
)
