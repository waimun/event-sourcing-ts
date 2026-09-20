import { Port } from '../port'
import { BaseDomainEvent } from './domain-event'

export class ShipDeparted extends BaseDomainEvent {
  port: Port

  constructor(aggregateId: string, dateTime?: Date) {
    super(ShipDeparted.name, aggregateId, dateTime)
    this.port = Port.atSea()
  }
}
