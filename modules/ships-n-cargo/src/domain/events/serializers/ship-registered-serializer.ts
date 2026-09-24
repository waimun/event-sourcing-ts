import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipRegistered } from '../ship-registered'
import type { EventSerializable } from './event-serializable'

export class ShipRegisteredSerializer implements EventSerializable<ShipRegistered> {
  readonly eventType = ShipRegistered.eventType

  eventFromJson(json: string): ShipRegistered {
    const { aggregateId, name, portName, portCountry, occurredAt, recordedAt } = JSON.parse(json)
    return new ShipRegistered(
      aggregateId,
      name,
      new Port(new PortName(portName), new Country(portCountry)),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: ShipRegistered): string {
    const payload = JSON.parse(event.asJson())
    payload.name = event.name
    payload.portName = event.port.name
    payload.portCountry = event.port.country
    return JSON.stringify(payload)
  }
}
