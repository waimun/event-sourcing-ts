import { EventJournal } from '../domain/events/event-journal'
import { DomainEvent } from '../domain/events/domain-event'
import { InMemoryEventJournal } from '../infrastructure/persistence/in-memory-event-journal'

export const eventDataStore: EventJournal<string, DomainEvent> = new InMemoryEventJournal('ships-n-cargo')
