import type { Id } from '../../shared/domain/id'
import type { Container } from '../container'

export class LoadContainer {
  readonly id: string
  readonly dateTime: Date
  readonly container: Container

  constructor(id: Id, container: Container, dateTime: Date = new Date()) {
    this.id = id.value
    this.dateTime = dateTime
    this.container = container
  }
}
