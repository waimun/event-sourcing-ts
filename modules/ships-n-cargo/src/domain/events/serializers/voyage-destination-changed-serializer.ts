import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDestinationChanged } from '../voyage-destination-changed'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface SerializedPort {
  readonly name: string
  readonly country: string
}

interface VoyageDestinationChangedData {
  readonly previousDestination: SerializedPort
  readonly destination: SerializedPort
  readonly reason: string
}

export class VoyageDestinationChangedSerializer
  implements EventSerializable<VoyageDestinationChanged, VoyageDestinationChangedData>
{
  readonly eventType = VoyageDestinationChanged.eventType
  readonly schemaVersion = 1

  eventFromData(
    metadata: EventMetadata,
    data: VoyageDestinationChangedData
  ): VoyageDestinationChanged {
    return new VoyageDestinationChanged(
      metadata.aggregateId,
      new Port(
        new PortName(data.previousDestination.name),
        new Country(data.previousDestination.country)
      ),
      new Port(new PortName(data.destination.name), new Country(data.destination.country)),
      data.reason,
      metadata.occurredAt,
      metadata.recordedAt
    )
  }

  eventToData(event: VoyageDestinationChanged): VoyageDestinationChangedData {
    return {
      previousDestination: event.previousDestination,
      destination: event.destination,
      reason: event.reason
    }
  }
}
