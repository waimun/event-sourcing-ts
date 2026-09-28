import { ShipDeparted } from '../ship-departed'
import type { EventSerializable } from './event-serializable'

export class ShipDepartedSerializer implements EventSerializable<ShipDeparted> {
  readonly eventType = ShipDeparted.eventType

  eventFromJson(json: string): ShipDeparted {
    const { aggregateId, occurredAt, recordedAt } = JSON.parse(json)
    return new ShipDeparted(aggregateId, new Date(occurredAt), new Date(recordedAt))
  }

  eventToJson(event: ShipDeparted): string {
    return JSON.stringify({
      type: event.type,
      schemaVersion: 1,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: {}
    })
  }
}
