import { Country } from '../country'
import { Port } from '../port'
import { PortName } from '../port-name'
import { VoyageChangeReason } from '../voyage-change-reason'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'VoyageDestinationChanged'

const copyPort = (port: Port): Port => new Port(new PortName(port.name), new Country(port.country))

export class VoyageDestinationChanged extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly previousDestination: Port
  readonly destination: Port
  readonly reason: string

  constructor(
    aggregateId: string,
    previousDestination: Port,
    destination: Port,
    reason: string,
    occurredAt?: Date,
    recordedAt?: Date
  ) {
    super(VoyageDestinationChanged.eventType, aggregateId, occurredAt, recordedAt)
    this.previousDestination = copyPort(previousDestination)
    this.destination = copyPort(destination)
    this.reason = new VoyageChangeReason(reason).value
    Object.freeze(this)
  }
}
