import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { ShipArrived } from '../ship-arrived'
import type { EventSerializable } from './event-serializable'

export class ShipArrivedSerializer implements EventSerializable<ShipArrived> {
  readonly eventType = ShipArrived.eventType

  eventFromJson(json: string): ShipArrived {
    const { aggregateId, occurredAt, recordedAt, data } = JSON.parse(json)
    return new ShipArrived(
      aggregateId,
      new Port(new PortName(data.port.name), new Country(data.port.country)),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: ShipArrived): string {
    return JSON.stringify({
      type: event.type,
      schemaVersion: 1,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: { port: event.port }
    })
  }
}
