import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ShipCreated'

export class ShipCreated extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly name: string

  constructor(aggregateId: string, name: string, dateTime?: Date, recordedAt?: Date) {
    super(ShipCreated.eventType, aggregateId, dateTime, recordedAt)
    this.name = name
    Object.freeze(this)
  }
}
