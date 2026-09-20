import type { Cargo } from '../cargo'
import { BaseDomainEvent } from './domain-event'

export class CargoLoaded extends BaseDomainEvent {
  cargo: Cargo

  constructor(aggregateId: string, cargo: Cargo, dateTime?: Date) {
    super(CargoLoaded.name, aggregateId, dateTime)
    this.cargo = cargo
  }
}
