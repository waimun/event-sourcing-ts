import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageCancelled } from '../voyage-cancelled'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface SerializedPort {
  readonly name: string
  readonly country: string
}

interface VoyageCancelledData {
  readonly origin: SerializedPort
  readonly destination: SerializedPort
  readonly reason: string
}

export class VoyageCancelledSerializer
  implements EventSerializable<VoyageCancelled, VoyageCancelledData>
{
  readonly eventType = VoyageCancelled.eventType
  readonly schemaVersion = 1

  eventFromData(metadata: EventMetadata, data: VoyageCancelledData): VoyageCancelled {
    return new VoyageCancelled(
      metadata.aggregateId,
      new Port(new PortName(data.origin.name), new Country(data.origin.country)),
      new Port(new PortName(data.destination.name), new Country(data.destination.country)),
      data.reason,
      metadata.occurredAt,
      metadata.recordedAt
    )
  }

  eventToData(event: VoyageCancelled): VoyageCancelledData {
    return {
      origin: event.origin,
      destination: event.destination,
      reason: event.reason
    }
  }
}
