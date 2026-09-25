import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyagePlanned } from '../voyage-planned'
import type { EventSerializable } from './event-serializable'

export class VoyagePlannedSerializer implements EventSerializable<VoyagePlanned> {
  readonly eventType = VoyagePlanned.eventType

  eventFromJson(json: string): VoyagePlanned {
    const {
      aggregateId,
      originName,
      originCountry,
      destinationName,
      destinationCountry,
      occurredAt,
      recordedAt
    } = JSON.parse(json)
    return new VoyagePlanned(
      aggregateId,
      new Port(new PortName(originName), new Country(originCountry)),
      new Port(new PortName(destinationName), new Country(destinationCountry)),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: VoyagePlanned): string {
    return JSON.stringify({
      ...JSON.parse(event.asJson()),
      originName: event.origin.name,
      originCountry: event.origin.country,
      destinationName: event.destination.name,
      destinationCountry: event.destination.country
    })
  }
}
