import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'VoyageDiverted'

const copyPort = (port: Port): Port => new Port(new PortName(port.name), new Country(port.country))

export class VoyageDiverted extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly previousDestination: Port
  readonly destination: Port

  constructor(
    aggregateId: string,
    previousDestination: Port,
    destination: Port,
    occurredAt?: Date,
    recordedAt?: Date
  ) {
    super(VoyageDiverted.eventType, aggregateId, occurredAt, recordedAt)
    this.previousDestination = copyPort(previousDestination)
    this.destination = copyPort(destination)
    Object.freeze(this)
  }
}
