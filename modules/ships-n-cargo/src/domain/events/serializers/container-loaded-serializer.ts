import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { CargoReference } from '../../cargo-reference'
import { Container } from '../../container'
import { ContainerLoaded } from '../container-loaded'
import type { EventSerializable } from './event-serializable'

export class ContainerLoadedSerializer implements EventSerializable<ContainerLoaded> {
  readonly eventType = ContainerLoaded.eventType

  eventFromJson(json: string): ContainerLoaded {
    const { aggregateId, occurredAt, recordedAt, data } = JSON.parse(json)
    return new ContainerLoaded(
      aggregateId,
      new Container(
        new Id(data.container.containerId),
        new CargoReference(data.container.cargoReference),
        new Name(data.container.description, 'Container description')
      ),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: ContainerLoaded): string {
    return JSON.stringify({
      type: event.type,
      schemaVersion: 1,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      data: { container: event.container }
    })
  }
}
