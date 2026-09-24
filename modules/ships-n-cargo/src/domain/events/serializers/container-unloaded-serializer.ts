import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { Container } from '../../container'
import { ContainerUnloaded } from '../container-unloaded'
import type { EventSerializable } from './event-serializable'

export class ContainerUnloadedSerializer implements EventSerializable<ContainerUnloaded> {
  readonly eventType = ContainerUnloaded.eventType

  eventFromJson(json: string): ContainerUnloaded {
    const { aggregateId, container, occurredAt, recordedAt } = JSON.parse(json)
    return new ContainerUnloaded(
      aggregateId,
      new Container(
        new Id(container.containerId),
        new Name(container.description, 'Container description')
      ),
      new Date(occurredAt),
      new Date(recordedAt)
    )
  }

  eventToJson(event: ContainerUnloaded): string {
    const payload = JSON.parse(event.asJson())
    payload.container = event.container
    return JSON.stringify(payload)
  }
}
