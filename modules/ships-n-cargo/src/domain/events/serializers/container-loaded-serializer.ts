import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { CargoReference } from '../../cargo-reference'
import { Container } from '../../container'
import { ContainerLoaded } from '../container-loaded'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface ContainerLoadedData {
  readonly container: Container
}

export class ContainerLoadedSerializer
  implements EventSerializable<ContainerLoaded, ContainerLoadedData>
{
  readonly eventType = ContainerLoaded.eventType
  readonly schemaVersion = 1

  toEvent(metadata: EventMetadata, data: ContainerLoadedData): ContainerLoaded {
    return new ContainerLoaded(
      metadata.aggregateId,
      new Container(
        new Id(data.container.containerId),
        new CargoReference(data.container.cargoReference),
        new Name(data.container.description, 'Container description')
      ),
      metadata.occurredAt,
      metadata.recordedAt
    )
  }

  toData(event: ContainerLoaded): ContainerLoadedData {
    return { container: event.container }
  }
}
