import { Id } from '../../shared/domain/id'

export class SailShip {
  id: string
  dateTime: Date = new Date()

  constructor (id: Id, dateTime: Date = new Date()) {
    this.id = id.value
    this.dateTime = dateTime
  }
}
