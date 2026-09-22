import { Name } from '../../../shared/domain/name'
import { Cargo } from '../../cargo'
import { CargoLoaded } from '../cargo-loaded'
import type { EventSerializable } from './event-serializable'

export class CargoLoadedSerializer implements EventSerializable<CargoLoaded> {
  readonly eventType = CargoLoaded.eventType

  eventFromJson(json: string): CargoLoaded {
    const { aggregateId, cargo, occurredAt, recordedAt } = JSON.parse(json)
    return new CargoLoaded(
      aggregateId,
      new Cargo(new Name(cargo)),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: CargoLoaded): string {
    const payload = JSON.parse(event.asJson())
    payload.cargo = event.cargo.name

    return JSON.stringify(payload)
  }
}
