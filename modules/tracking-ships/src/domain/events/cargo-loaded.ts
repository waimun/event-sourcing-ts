import { BaseDomainEvent } from './domain-event'
import { Cargo } from '../cargo'

export class CargoLoaded extends BaseDomainEvent {
  cargo: Cargo

  constructor (aggregateId: string, cargo: Cargo, dateTime?: Date) {
    super(CargoLoaded.name, aggregateId, dateTime)
    this.cargo = cargo
  }

  payload (): string {
    const payload = JSON.parse(this.basePayload)
    payload.cargo = this.cargo.name
    payload.dateTime = this.dateTimeOccurred

    return JSON.stringify(payload)
  }

  static handlePayload (): Function {
    return (payload: string): CargoLoaded => {
      const { aggregateId, cargo, dateTime } = JSON.parse(payload)
      return new CargoLoaded(aggregateId, new Cargo(cargo), dateTime)
    }
  }
}
