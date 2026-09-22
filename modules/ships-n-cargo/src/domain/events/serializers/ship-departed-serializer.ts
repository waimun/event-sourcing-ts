import { ShipDeparted } from '../ship-departed'
import type { EventSerializable } from './event-serializable'

export class ShipDepartedSerializer implements EventSerializable<ShipDeparted> {
  readonly eventType = ShipDeparted.eventType

  eventFromJson(json: string): ShipDeparted {
    const { aggregateId, occurredAt, recordedAt } = JSON.parse(json)
    return new ShipDeparted(aggregateId, new Date(occurredAt), new Date(recordedAt))
  }

  eventToJson(event: ShipDeparted): string {
    const payload = JSON.parse(event.asJson())
    payload.portName = event.port.name
    payload.portCountry = event.port.country
    return JSON.stringify(payload)
  }
}
