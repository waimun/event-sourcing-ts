import type { Id } from '../../shared/domain/id'
import type { Container } from '../container'

export class LoadContainer {
  readonly id: string
  readonly container: Container

  constructor(id: Id, container: Container) {
    this.id = id.value
    this.container = container
  }
}
