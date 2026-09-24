import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ShipRegistered'

export class ShipRegistered extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly name: string
  readonly port: Port

  constructor(aggregateId: string, name: string, port: Port, dateTime?: Date, recordedAt?: Date) {
    super(ShipRegistered.eventType, aggregateId, dateTime, recordedAt)
    this.name = name
    this.port = new Port(new PortName(port.name), new Country(port.country))
    Object.freeze(this)
  }
}
