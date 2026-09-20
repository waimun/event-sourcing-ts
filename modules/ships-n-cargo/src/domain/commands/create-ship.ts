import type { Id } from '../../shared/domain/id'
import type { Name } from '../../shared/domain/name'

export class CreateShip {
  readonly id: string
  readonly name: string

  constructor(name: Name, id: Id) {
    this.name = name.value
    this.id = id.value
  }
}
