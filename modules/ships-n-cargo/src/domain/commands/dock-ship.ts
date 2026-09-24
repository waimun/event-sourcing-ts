import type { Id } from '../../shared/domain/id'
import type { Port } from '../port'

export class DockShip {
  readonly id: string
  readonly port: Port

  constructor(id: Id, port: Port) {
    this.id = id.value
    this.port = port
  }
}
