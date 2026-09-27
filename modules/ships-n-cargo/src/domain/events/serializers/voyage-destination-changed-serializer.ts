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
    const {
      aggregateId,
      previousDestinationName,
      previousDestinationCountry,
      destinationName,
      destinationCountry,
      reason,
      occurredAt,
      recordedAt
    } = JSON.parse(json)
    return new VoyageDestinationChanged(
      aggregateId,
      new Port(new PortName(previousDestinationName), new Country(previousDestinationCountry)),
      new Port(new PortName(destinationName), new Country(destinationCountry)),
      reason,
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: VoyageDestinationChanged): string {
    return JSON.stringify({
      ...JSON.parse(event.asJson()),
      previousDestinationName: event.previousDestination.name,
      previousDestinationCountry: event.previousDestination.country,
      destinationName: event.destination.name,
      destinationCountry: event.destination.country,
      reason: event.reason
    })
  }
}
