import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDiverted } from '../voyage-diverted'
import type { EventSerializable } from './event-serializable'

export class VoyageDivertedSerializer implements EventSerializable<VoyageDiverted> {
  readonly eventType = VoyageDiverted.eventType

  eventFromJson(json: string): VoyageDiverted {
    const { aggregateId, occurredAt, recordedAt, data } = JSON.parse(json)
    return new VoyageDiverted(
      aggregateId,
      new Port(
        new PortName(data.previousDestination.name),
        new Country(data.previousDestination.country)
      ),
      new Port(new PortName(data.destination.name), new Country(data.destination.country)),
      data.reason,
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: VoyageDiverted): string {
    return JSON.stringify({
      type: event.type,
      schemaVersion: 1,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: {
        previousDestination: event.previousDestination,
        destination: event.destination,
        reason: event.reason
      }
    })
  }
}
