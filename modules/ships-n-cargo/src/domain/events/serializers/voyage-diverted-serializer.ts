import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageDiverted } from '../voyage-diverted'
import type { EventSerializable } from './event-serializable'

export class VoyageDivertedSerializer implements EventSerializable<VoyageDiverted> {
  readonly eventType = VoyageDiverted.eventType

  eventFromJson(json: string): VoyageDiverted {
    const {
      aggregateId,
      previousDestinationName,
      previousDestinationCountry,
      destinationName,
      destinationCountry,
      occurredAt,
      recordedAt
    } = JSON.parse(json)
    return new VoyageDiverted(
      aggregateId,
      new Port(new PortName(previousDestinationName), new Country(previousDestinationCountry)),
      new Port(new PortName(destinationName), new Country(destinationCountry)),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: VoyageDiverted): string {
    return JSON.stringify({
      ...JSON.parse(event.asJson()),
      previousDestinationName: event.previousDestination.name,
      previousDestinationCountry: event.previousDestination.country,
      destinationName: event.destination.name,
      destinationCountry: event.destination.country
    })
  }
}
