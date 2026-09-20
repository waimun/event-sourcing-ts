import { Port } from '../port'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ShipDeparted'

export class ShipDeparted extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  port: Port

  constructor(aggregateId: string, dateTime?: Date) {
    super(ShipDeparted.eventType, aggregateId, dateTime)
    this.port = Port.atSea()
  }
}
