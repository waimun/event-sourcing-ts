import type { Cargo } from '../cargo'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'CargoLoaded'

export class CargoLoaded extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  cargo: Cargo

  constructor(aggregateId: string, cargo: Cargo, dateTime?: Date) {
    super(CargoLoaded.eventType, aggregateId, dateTime)
    this.cargo = cargo
  }
}
