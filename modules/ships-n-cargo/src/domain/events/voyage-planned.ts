import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'VoyagePlanned'

const copyPort = (port: Port): Port => new Port(new PortName(port.name), new Country(port.country))

export class VoyagePlanned extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly origin: Port
  readonly destination: Port

  constructor(
    aggregateId: string,
    origin: Port,
    destination: Port,
    occurredAt?: Date,
    recordedAt?: Date
  ) {
    super(VoyagePlanned.eventType, aggregateId, occurredAt, recordedAt)
    this.origin = copyPort(origin)
    this.destination = copyPort(destination)
    Object.freeze(this)
  }
}
