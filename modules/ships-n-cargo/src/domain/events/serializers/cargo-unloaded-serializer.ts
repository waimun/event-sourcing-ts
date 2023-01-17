import { EventSerializable } from './event-serializable'
import { Cargo } from '../../cargo'
import { CargoUnloaded } from '../cargo-unloaded'
import { Name } from '../../../shared/domain/name'

export class CargoUnloadedSerializer implements EventSerializable<CargoUnloaded> {
  eventFromJson (json: string): CargoUnloaded {
    const { aggregateId, cargo, occurredAt } = JSON.parse(json)
    return new CargoUnloaded(aggregateId, new Cargo(new Name(cargo)), new Date(occurredAt))
  }

  eventToJson (event: CargoUnloaded): string {
    const payload = JSON.parse(event.asJson())
    payload.cargo = event.cargo.name
    return JSON.stringify(payload)
  }
}
