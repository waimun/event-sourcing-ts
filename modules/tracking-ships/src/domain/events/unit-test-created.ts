import { BaseDomainEvent } from './domain-event'

/**
 * Not a real event. This class is used to test a condition in the Ship object
 * during the replay of events where no event handler exist for this type.
 */
export class UnitTestCreated extends BaseDomainEvent {
  constructor (aggregateId: string) {
    super(UnitTestCreated.name, aggregateId)
  }
}
