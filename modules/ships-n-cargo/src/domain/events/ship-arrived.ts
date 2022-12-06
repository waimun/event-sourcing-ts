import { Port } from '../port'
import { BaseDomainEvent } from './domain-event'

export class ShipArrived extends BaseDomainEvent {
  port: Port

  constructor (aggregateId: string, port: Port, dateTime?: Date) {
    super(ShipArrived.name, aggregateId, dateTime)
    this.port = port
  }
}
