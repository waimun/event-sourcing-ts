import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDiverted } from '../voyage-diverted'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface SerializedPort {
  readonly name: string
  readonly country: string
}

interface VoyageDivertedData {
  readonly previousDestination: SerializedPort
  readonly destination: SerializedPort
  readonly reason: string
}

export class VoyageDivertedSerializer
  implements EventSerializable<VoyageDiverted, VoyageDivertedData>
{
  readonly eventType = VoyageDiverted.eventType
  readonly schemaVersion = 1

  eventFromData(metadata: EventMetadata, data: VoyageDivertedData): VoyageDiverted {
    return new VoyageDiverted(
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

  eventToData(event: VoyageDiverted): VoyageDivertedData {
    return {
      previousDestination: event.previousDestination,
      destination: event.destination,
      reason: event.reason
    }
  }
}
