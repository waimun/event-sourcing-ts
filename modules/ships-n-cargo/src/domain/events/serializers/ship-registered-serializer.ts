import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipRegistered } from '../ship-registered'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface SerializedPort {
  readonly name: string
  readonly country: string
}

interface ShipRegisteredData {
  readonly name: string
  readonly port: SerializedPort
}

export class ShipRegisteredSerializer
  implements EventSerializable<ShipRegistered, ShipRegisteredData>
{
  readonly eventType = ShipRegistered.eventType
  readonly schemaVersion = 1

  eventFromData(metadata: EventMetadata, data: ShipRegisteredData): ShipRegistered {
    return new ShipRegistered(
      metadata.aggregateId,
      data.name,
      new Port(new PortName(data.port.name), new Country(data.port.country)),
      metadata.occurredAt,
      metadata.recordedAt
    )
  }

  eventToData(event: ShipRegistered): ShipRegisteredData {
    return { name: event.name, port: event.port }
  }
}
