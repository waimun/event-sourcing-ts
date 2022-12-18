import { BaseDomainEvent } from './domain-event'

export class ShipCreated extends BaseDomainEvent {
  name: string

  constructor (aggregateId: string, name: string, dateTime?: Date) {
    super(ShipCreated.name, aggregateId, dateTime)
    this.name = name
  }
}
