import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'UnitTestCreated'

/**
 * Not a real event. This class is used to test a condition in the Ship object
 * during the replay of events where no event handler exist for this type.
 */
export class UnitTestCreated extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE

  constructor(aggregateId: string) {
    super(UnitTestCreated.eventType, aggregateId)
  }
}
