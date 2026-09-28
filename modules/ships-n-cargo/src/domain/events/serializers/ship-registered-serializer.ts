import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipRegistered } from '../ship-registered'
import type { EventSerializable } from './event-serializable'

export class ShipRegisteredSerializer implements EventSerializable<ShipRegistered> {
  readonly eventType = ShipRegistered.eventType

  eventFromJson(json: string): ShipRegistered {
    const { aggregateId, occurredAt, recordedAt, data } = JSON.parse(json)
    return new ShipRegistered(
      aggregateId,
      data.name,
      new Port(new PortName(data.port.name), new Country(data.port.country)),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: ShipRegistered): string {
    return JSON.stringify({
      type: event.type,
      schemaVersion: 1,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: {
        name: event.name,
        port: event.port
      }
    })
  }
}
