import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { VoyageChangeReason } from '../voyage-change-reason'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'VoyageCancelled'

const copyPort = (port: Port): Port => new Port(new PortName(port.name), new Country(port.country))

export class VoyageCancelled extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly origin: Port
  readonly destination: Port
  readonly reason: string

  constructor(
    aggregateId: string,
    origin: Port,
    destination: Port,
    reason: string,
    occurredAt?: Date,
    recordedAt?: Date
  ) {
    super(VoyageCancelled.eventType, aggregateId, occurredAt, recordedAt)
    this.origin = copyPort(origin)
    this.destination = copyPort(destination)
    this.reason = new VoyageChangeReason(reason).value
    Object.freeze(this)
  }
}
