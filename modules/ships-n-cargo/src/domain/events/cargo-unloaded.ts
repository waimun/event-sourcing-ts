import { Name } from '../../shared/domain/name'
import { Cargo } from '../cargo'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'CargoUnloaded'

export class CargoUnloaded extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly cargo: Cargo

  constructor(aggregateId: string, cargo: Cargo, dateTime?: Date, recordedAt?: Date) {
    super(CargoUnloaded.eventType, aggregateId, dateTime, recordedAt)
    this.cargo = new Cargo(new Name(cargo.name), cargo.hasBeenInCanada)
    Object.freeze(this)
  }
}
