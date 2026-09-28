import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyagePlanned } from '../voyage-planned'
import type { EventSerializable } from './event-serializable'

export class VoyagePlannedSerializer implements EventSerializable<VoyagePlanned> {
  readonly eventType = VoyagePlanned.eventType

  eventFromJson(json: string): VoyagePlanned {
    const { aggregateId, occurredAt, recordedAt, data } = JSON.parse(json)
    return new VoyagePlanned(
      aggregateId,
      new Port(new PortName(data.origin.name), new Country(data.origin.country)),
      new Port(new PortName(data.destination.name), new Country(data.destination.country)),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: VoyagePlanned): string {
    return JSON.stringify({
      type: event.type,
      schemaVersion: 1,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: {
        origin: event.origin,
        destination: event.destination
      }
    })
  }
}
