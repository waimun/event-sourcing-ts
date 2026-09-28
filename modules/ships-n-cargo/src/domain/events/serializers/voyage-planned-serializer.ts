import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyagePlanned } from '../voyage-planned'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface SerializedPort {
  readonly name: string
  readonly country: string
}

interface VoyagePlannedData {
  readonly origin: SerializedPort
  readonly destination: SerializedPort
}

export class VoyagePlannedSerializer
  implements EventSerializable<VoyagePlanned, VoyagePlannedData>
{
  readonly eventType = VoyagePlanned.eventType
  readonly schemaVersion = 1

  toEvent(metadata: EventMetadata, data: VoyagePlannedData): VoyagePlanned {
    return new VoyagePlanned(
      metadata.aggregateId,
      new Port(new PortName(data.origin.name), new Country(data.origin.country)),
      new Port(new PortName(data.destination.name), new Country(data.destination.country)),
      metadata.occurredAt,
      metadata.recordedAt
    )
  }

  toData(event: VoyagePlanned): VoyagePlannedData {
    return { origin: event.origin, destination: event.destination }
  }
}
