import type { Cargo } from '../cargo'
import { BaseDomainEvent } from './domain-event'

export class CargoUnloaded extends BaseDomainEvent {
  cargo: Cargo

  constructor(aggregateId: string, cargo: Cargo, dateTime?: Date) {
    super(CargoUnloaded.name, aggregateId, dateTime)
    this.cargo = cargo
  }
}
