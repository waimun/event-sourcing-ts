import { BaseDomainEvent } from './domain-event'
import { Cargo } from '../cargo'

export class CargoLoaded extends BaseDomainEvent {
  cargo: Cargo

  constructor (aggregateId: string, cargo: Cargo, dateTime?: Date) {
    super(CargoLoaded.name, aggregateId, dateTime)
    this.cargo = cargo
  }
}
