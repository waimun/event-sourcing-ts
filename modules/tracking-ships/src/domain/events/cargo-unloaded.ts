import { BaseDomainEvent } from './domain-event'
import { Cargo } from '../cargo'

export class CargoUnloaded extends BaseDomainEvent {
  cargo: Cargo

  constructor (aggregateId: string, cargo: Cargo, dateTime?: Date) {
    super(CargoUnloaded.name, aggregateId, dateTime)
    this.cargo = cargo
  }

  payload (): string {
    const payload = JSON.parse(this.basePayload)
    payload.cargo = this.cargo.name
    return JSON.stringify(payload)
  }

  static handlePayload (): Function {
    return (payload: string): CargoUnloaded => {
      const { aggregateId, cargo, dateTime } = JSON.parse(payload)
      return new CargoUnloaded(aggregateId, new Cargo(cargo), dateTime)
    }
  }
}
