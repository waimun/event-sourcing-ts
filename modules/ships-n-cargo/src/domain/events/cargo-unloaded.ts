import { BaseDomainEvent } from './domain-event'
import { Cargo } from '../cargo'

export class CargoUnloaded extends BaseDomainEvent {
  cargo: Cargo

  constructor (aggregateId: string, cargo: Cargo, dateTime?: Date) {
    super(CargoUnloaded.name, aggregateId, dateTime)
    this.cargo = cargo
  }
}
