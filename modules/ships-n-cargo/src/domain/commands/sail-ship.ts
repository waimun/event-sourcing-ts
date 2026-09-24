import type { Id } from '../../shared/domain/id'

export class SailShip {
  readonly id: string

  constructor(id: Id) {
    this.id = id.value
  }
}
