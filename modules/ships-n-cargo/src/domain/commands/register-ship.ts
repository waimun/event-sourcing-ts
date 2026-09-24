import type { Id } from '../../shared/domain/id'
import type { Name } from '../../shared/domain/name'
import type { Port } from '../port'

export class RegisterShip {
  readonly id: string
  readonly name: string
  readonly port: Port

  constructor(name: Name, id: Id, port: Port) {
    this.name = name.value
    this.id = id.value
    this.port = port
  }
}
