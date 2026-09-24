import type { Id } from '../shared/domain/id'
import type { Name } from '../shared/domain/name'

export class Container {
  readonly containerId: string
  readonly description: string

  constructor(containerId: Id, description: Name) {
    this.containerId = containerId.value
    this.description = description.value
    Object.freeze(this)
  }
}
