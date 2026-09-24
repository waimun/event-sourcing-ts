import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { CargoReference } from '../../cargo-reference'
import { Container } from '../../container'
import { ContainerLoaded } from '../container-loaded'
import type { EventSerializable } from './event-serializable'

export class ContainerLoadedSerializer implements EventSerializable<ContainerLoaded> {
  readonly eventType = ContainerLoaded.eventType

  eventFromJson(json: string): ContainerLoaded {
    const { aggregateId, container, occurredAt, recordedAt } = JSON.parse(json)
    return new ContainerLoaded(
      aggregateId,
      new Container(
        new Id(container.containerId),
        new CargoReference(container.cargoReference),
        new Name(container.description, 'Container description')
      ),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: ContainerLoaded): string {
    const payload = JSON.parse(event.asJson())
    payload.container = event.container

    return JSON.stringify(payload)
  }
}
