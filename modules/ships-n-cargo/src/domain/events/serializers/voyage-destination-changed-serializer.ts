import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDestinationChanged } from '../voyage-destination-changed'
import type { EventSerializable } from './event-serializable'

export class VoyageDestinationChangedSerializer
  implements EventSerializable<VoyageDestinationChanged>
{
  readonly eventType = VoyageDestinationChanged.eventType

  eventFromJson(json: string): VoyageDestinationChanged {
    const { aggregateId, occurredAt, recordedAt, data } = JSON.parse(json)
    return new VoyageDestinationChanged(
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

  eventToJson(event: VoyageDestinationChanged): string {
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
