import { Country } from '../../country'
import { Port } from '../../port'
import { PortName } from '../../port-name'
import { VoyageCancelled } from '../voyage-cancelled'
import type { EventSerializable } from './event-serializable'

export class VoyageCancelledSerializer implements EventSerializable<VoyageCancelled> {
  readonly eventType = VoyageCancelled.eventType

  eventFromJson(json: string): VoyageCancelled {
    const {
      aggregateId,
      originName,
      originCountry,
      destinationName,
      destinationCountry,
      reason,
      occurredAt,
      recordedAt
    } = JSON.parse(json)
    return new VoyageCancelled(
      aggregateId,
      new Port(new PortName(originName), new Country(originCountry)),
      new Port(new PortName(destinationName), new Country(destinationCountry)),
      reason,
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: VoyageCancelled): string {
    return JSON.stringify({
      ...JSON.parse(event.asJson()),
      originName: event.origin.name,
      originCountry: event.origin.country,
      destinationName: event.destination.name,
      destinationCountry: event.destination.country,
      reason: event.reason
    })
  }
}
