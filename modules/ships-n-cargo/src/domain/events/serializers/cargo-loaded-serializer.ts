import { EventSerializable } from './event-serializable'
import { Cargo } from '../../cargo'
import { CargoLoaded } from '../cargo-loaded'

export class CargoLoadedSerializer implements EventSerializable<CargoLoaded> {
  eventFromJson (json: string): CargoLoaded {
    const { aggregateId, cargo, dateTimeOccurred } = JSON.parse(json)
    return new CargoLoaded(aggregateId, new Cargo(cargo), new Date(dateTimeOccurred))
  }

  eventToJson (event: CargoLoaded): string {
    const payload = JSON.parse(event.asJson())
    payload.cargo = event.cargo.name

    return JSON.stringify(payload)
  }
}
