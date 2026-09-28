import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipArrived } from '../ship-arrived'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface SerializedPort {
  readonly name: string
  readonly country: string
}

interface ShipArrivedData {
  readonly port: SerializedPort
}

export class ShipArrivedSerializer implements EventSerializable<ShipArrived, ShipArrivedData> {
  readonly eventType = ShipArrived.eventType
  readonly schemaVersion = 1

  toEvent(metadata: EventMetadata, data: ShipArrivedData): ShipArrived {
    return new ShipArrived(
      metadata.aggregateId,
      new Port(new PortName(data.port.name), new Country(data.port.country)),
      metadata.occurredAt,
      metadata.recordedAt
    )
  }

  toData(event: ShipArrived): ShipArrivedData {
    return { port: event.port }
  }
}
