import { ShipDeparted } from '../ship-departed'
import type { EventMetadata, EventSerializable } from './event-serializable'

type ShipDepartedData = Record<string, never>

export class ShipDepartedSerializer implements EventSerializable<ShipDeparted, ShipDepartedData> {
  readonly eventType = ShipDeparted.eventType
  readonly schemaVersion = 1

  eventFromData(metadata: EventMetadata, _data: ShipDepartedData): ShipDeparted {
    return new ShipDeparted(metadata.aggregateId, metadata.occurredAt, metadata.recordedAt)
  }

  eventToData(_event: ShipDeparted): ShipDepartedData {
    return {}
  }
}
