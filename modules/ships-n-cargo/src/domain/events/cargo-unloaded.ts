import type { Cargo } from '../cargo'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'CargoUnloaded'

export class CargoUnloaded extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  cargo: Cargo

  constructor(aggregateId: string, cargo: Cargo, dateTime?: Date, recordedAt?: Date) {
    super(CargoUnloaded.eventType, aggregateId, dateTime, recordedAt)
    this.cargo = cargo
  }
}
