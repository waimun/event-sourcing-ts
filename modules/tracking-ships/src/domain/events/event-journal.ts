import { DomainEvent } from './domain-event'
import { Result } from '../../shared/result'

export interface EventJournal {
  append: (aggregateId: string, events: DomainEvent[]) => void
  entriesByAggregate: (aggregateId: string) => DomainEvent[]
  eventFrom: (json: string) => Result<DomainEvent>
}
