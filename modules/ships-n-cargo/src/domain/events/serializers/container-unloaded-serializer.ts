import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { CargoReference } from '../../cargo-reference'
import { Container } from '../../container'
import { ContainerUnloaded } from '../container-unloaded'
import type { EventMetadata, EventSerializable } from './event-serializable'

interface ContainerUnloadedData {
  readonly container: Container
}

export class ContainerUnloadedSerializer
  implements EventSerializable<ContainerUnloaded, ContainerUnloadedData>
{
  readonly eventType = ContainerUnloaded.eventType
  readonly schemaVersion = 1

  toEvent(metadata: EventMetadata, data: ContainerUnloadedData): ContainerUnloaded {
    return new ContainerUnloaded(
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

  toData(event: ContainerUnloaded): ContainerUnloadedData {
    return { container: event.container }
  }
}
