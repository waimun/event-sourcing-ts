import type { Id } from '../../shared/domain/id'

export class UnloadContainer {
  readonly id: string
  readonly containerId: string

  constructor(id: Id, containerId: Id) {
    this.id = id.value
    this.containerId = containerId.value
  }
}
