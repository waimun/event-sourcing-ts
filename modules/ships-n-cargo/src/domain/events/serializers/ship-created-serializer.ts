import { ShipCreated } from '../ship-created'
import type { EventSerializable } from './event-serializable'

export class ShipCreatedSerializer implements EventSerializable<ShipCreated> {
  readonly eventType = ShipCreated.eventType

  eventFromJson(json: string): ShipCreated {
    const { aggregateId, name, occurredAt } = JSON.parse(json)
    return new ShipCreated(aggregateId, name, new Date(occurredAt))
  }

  eventToJson(event: ShipCreated): string {
    const payload = JSON.parse(event.asJson())
    payload.name = event.name
    return JSON.stringify(payload)
  }
}
