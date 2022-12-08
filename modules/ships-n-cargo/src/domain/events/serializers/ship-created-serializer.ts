import { EventSerializable } from './event-serializable'
import { ShipCreated } from '../ship-created'

export class ShipCreatedSerializer implements EventSerializable<ShipCreated> {
  eventFromJson (json: string): ShipCreated {
    const { aggregateId, name } = JSON.parse(json)
    return new ShipCreated(aggregateId, name)
  }

  eventToJson (event: ShipCreated): string {
    const payload = JSON.parse(event.asJson())
    payload.name = event.name
    return JSON.stringify(payload)
  }
}