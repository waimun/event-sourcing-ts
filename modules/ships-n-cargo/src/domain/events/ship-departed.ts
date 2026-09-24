import { Port } from '../port'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ShipDeparted'

export class ShipDeparted extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly port: Port

  constructor(aggregateId: string, dateTime?: Date, recordedAt?: Date) {
    super(ShipDeparted.eventType, aggregateId, dateTime, recordedAt)
    this.port = Port.atSea()
    Object.freeze(this)
  }
}
