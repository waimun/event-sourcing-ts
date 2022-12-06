import { EventSerializable } from './event-serializable'
import { ShipDeparted } from '../ship-departed'

export class ShipDepartedSerializer implements EventSerializable<ShipDeparted> {
  eventFromJson (json: string): ShipDeparted {
    const { aggregateId, dateTime } = JSON.parse(json)
    return new ShipDeparted(aggregateId, dateTime)
  }

  eventToJson (event: ShipDeparted): string {
    const payload = JSON.parse(event.asJson())
    payload.portName = event.port.name
    payload.portCountry = event.port.country
    return JSON.stringify(payload)
  }
}
