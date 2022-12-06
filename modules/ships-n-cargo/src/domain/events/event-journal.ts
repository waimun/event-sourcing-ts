import { DomainEvent } from './domain-event'

export interface EventJournal {
  append: (aggregateId: string, ...events: DomainEvent[]) => void
  entriesByAggregate: (aggregateId: string) => DomainEvent[]
  eventFrom: (json: string) => DomainEvent
}
