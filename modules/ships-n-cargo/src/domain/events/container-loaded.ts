import { Id } from '../../shared/domain/id'
import { Name } from '../../shared/domain/name'
import { CargoReference } from '../cargo-reference'
import { Container } from '../container'
import { BaseDomainEvent } from './domain-event'

const EVENT_TYPE = 'ContainerLoaded'

export class ContainerLoaded extends BaseDomainEvent<typeof EVENT_TYPE> {
  static readonly eventType = EVENT_TYPE
  readonly container: Container

  constructor(aggregateId: string, container: Container, occurredAt?: Date, recordedAt?: Date) {
    super(ContainerLoaded.eventType, aggregateId, occurredAt, recordedAt)
    this.container = new Container(
      new Id(container.containerId),
      new CargoReference(container.cargoReference),
      new Name(container.description, 'Container description')
    )
    Object.freeze(this)
  }
}
