import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ShipArrived'

export class ShipArrived extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly port: Port

  constructor(aggregateId: string, port: Port, dateTime?: Date, recordedAt?: Date) {
    super(ShipArrived.eventType, aggregateId, dateTime, recordedAt)
    this.port = new Port(new PortName(port.name), new Country(port.country))
    Object.freeze(this)
  }
}
