import { BaseDomainEvent } from './domain-event'

export class ShipCreated extends BaseDomainEvent {
  name: string

  constructor (aggregateId: string, name: string) {
    super(ShipCreated.name, aggregateId)
    this.name = name
  }
}
