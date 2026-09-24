import type { Id } from '../../shared/domain/id'
import type { Port } from '../port'

export class DockShip {
  readonly id: string
  readonly port: Port
  readonly dateTime: Date

  constructor(id: Id, port: Port, dateTime: Date = new Date()) {
    this.id = id.value
    this.port = port
    this.dateTime = dateTime
  }
}
