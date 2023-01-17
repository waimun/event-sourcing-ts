import { EventSerializable } from './event-serializable'
import { Cargo } from '../../cargo'
import { CargoLoaded } from '../cargo-loaded'
import { Name } from '../../../shared/domain/name'

export class CargoLoadedSerializer implements EventSerializable<CargoLoaded> {
  eventFromJson (json: string): CargoLoaded {
    const { aggregateId, cargo, occurredAt } = JSON.parse(json)
    return new CargoLoaded(aggregateId, new Cargo(new Name(cargo)), new Date(occurredAt))
  }

  eventToJson (event: CargoLoaded): string {
    const payload = JSON.parse(event.asJson())
    payload.cargo = event.cargo.name

    return JSON.stringify(payload)
  }
}
