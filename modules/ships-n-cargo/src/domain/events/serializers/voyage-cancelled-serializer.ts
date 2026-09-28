import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageCancelled } from '../voyage-cancelled'
import type { EventSerializable } from './event-serializable'

export class VoyageCancelledSerializer implements EventSerializable<VoyageCancelled> {
  readonly eventType = VoyageCancelled.eventType

  eventFromJson(json: string): VoyageCancelled {
    const { aggregateId, occurredAt, recordedAt, data } = JSON.parse(json)
    return new VoyageCancelled(
      aggregateId,
      new Port(new PortName(data.origin.name), new Country(data.origin.country)),
      new Port(new PortName(data.destination.name), new Country(data.destination.country)),
      data.reason,
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: VoyageCancelled): string {
    return JSON.stringify({
      type: event.type,
      schemaVersion: 1,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: {
        origin: event.origin,
        destination: event.destination,
        reason: event.reason
      }
    })
  }
}
