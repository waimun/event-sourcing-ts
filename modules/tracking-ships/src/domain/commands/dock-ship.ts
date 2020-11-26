import { Port } from '../port'

export class DockShip {
  id: string
  port: Port = Port.none()
  dateTime: Date = new Date()

  constructor (id: string, port: Port, dateTime: Date = new Date()) {
    this.id = id
    this.port = port
    this.dateTime = dateTime
  }
}
