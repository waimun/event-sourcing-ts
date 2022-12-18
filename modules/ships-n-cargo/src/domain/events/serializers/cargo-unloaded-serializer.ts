import { EventSerializable } from './event-serializable'
import { Cargo } from '../../cargo'
import { CargoUnloaded } from '../cargo-unloaded'

export class CargoUnloadedSerializer implements EventSerializable<CargoUnloaded> {
  eventFromJson (json: string): CargoUnloaded {
    const { aggregateId, cargo, dateTimeOccurred } = JSON.parse(json)
    return new CargoUnloaded(aggregateId, new Cargo(cargo), new Date(dateTimeOccurred))
  }

  eventToJson (event: CargoUnloaded): string {
    const payload = JSON.parse(event.asJson())
    payload.cargo = event.cargo.name
    return JSON.stringify(payload)
  }
}
