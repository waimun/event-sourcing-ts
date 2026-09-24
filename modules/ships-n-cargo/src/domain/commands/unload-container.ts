import type { Id } from '../../shared/domain/id'

export class UnloadContainer {
  readonly id: string
  readonly dateTime: Date
  readonly containerId: string

  constructor(id: Id, containerId: Id, dateTime: Date = new Date()) {
    this.id = id.value
    this.dateTime = dateTime
    this.containerId = containerId.value
  }
}
