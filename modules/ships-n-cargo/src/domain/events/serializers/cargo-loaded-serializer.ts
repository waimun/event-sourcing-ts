import { EventSerializable } from './event-serializable'
import { Cargo } from '../../cargo'
import { CargoLoaded } from '../cargo-loaded'

export class CargoLoadedSerializer implements EventSerializable<CargoLoaded> {
  eventFromJson (json: string): CargoLoaded {
    const { aggregateId, cargo, dateTime } = JSON.parse(json)
    return new CargoLoaded(aggregateId, new Cargo(cargo), dateTime)
  }

  eventToJson (event: CargoLoaded): string {
    const payload = JSON.parse(event.asJson())
    payload.cargo = event.cargo.name
    payload.dateTime = event.dateTimeOccurred

    return JSON.stringify(payload)
  }
}
