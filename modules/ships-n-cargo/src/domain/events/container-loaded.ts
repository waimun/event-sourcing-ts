import { Id } from '../../shared/domain/id'
import { Name } from '../../shared/domain/name'
import { Container } from '../container'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ContainerLoaded'

export class ContainerLoaded extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly container: Container

  constructor(aggregateId: string, container: Container, dateTime?: Date, recordedAt?: Date) {
    super(ContainerLoaded.eventType, aggregateId, dateTime, recordedAt)
    this.container = new Container(
      new Id(container.containerId),
      new Name(container.description, 'Container description')
    )
    Object.freeze(this)
  }
}
