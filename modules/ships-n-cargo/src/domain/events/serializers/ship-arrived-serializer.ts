import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipArrived } from '../ship-arrived'
import type { EventSerializable } from './event-serializable'

export class ShipArrivedSerializer implements EventSerializable<ShipArrived> {
  readonly eventType = ShipArrived.eventType

  eventFromJson(json: string): ShipArrived {
    const { aggregateId, portName, portCountry, occurredAt } = JSON.parse(json)
    return new ShipArrived(
      aggregateId,
      new Port(new PortName(portName), new Country(portCountry)),
      new Date(occurredAt)
    )
  }

  eventToJson(event: ShipArrived): string {
    const payload = JSON.parse(event.asJson())
    payload.portName = event.port.name
    payload.portCountry = event.port.country
    return JSON.stringify(payload)
  }
}
