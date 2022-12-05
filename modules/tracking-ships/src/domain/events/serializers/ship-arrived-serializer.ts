import { EventSerializable } from './event-serializable'
import { Port } from '../../port'
import { ShipArrived } from '../ship-arrived'

export class ShipArrivedSerializer implements EventSerializable<ShipArrived> {
  eventFromJson (json: string): ShipArrived {
    const { aggregateId, portName, portCountry, dateTime } = JSON.parse(json)
    return new ShipArrived(aggregateId, new Port(portName, portCountry), dateTime)
  }

  eventToJson (event: ShipArrived): string {
    const payload = JSON.parse(event.asJson())
    payload.portName = event.port.name
    payload.portCountry = event.port.country
    return JSON.stringify(payload)
  }
}
