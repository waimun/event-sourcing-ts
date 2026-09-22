import type { Port } from '../port'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ShipArrived'

export class ShipArrived extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  port: Port

  constructor(aggregateId: string, port: Port, dateTime?: Date, recordedAt?: Date) {
    super(ShipArrived.eventType, aggregateId, dateTime, recordedAt)
    this.port = port
  }
}
