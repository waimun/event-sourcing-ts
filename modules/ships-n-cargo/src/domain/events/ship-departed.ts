import { BaseDomainEvent } from './domain-event'
import { Port } from '../port'

export class ShipDeparted extends BaseDomainEvent {
  port: Port

  constructor (aggregateId: string, dateTime?: Date) {
    super(ShipDeparted.name, aggregateId, dateTime)
    this.port = Port.atSea()
  }
}
