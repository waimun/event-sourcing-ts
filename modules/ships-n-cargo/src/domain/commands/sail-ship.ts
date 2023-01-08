import { Id } from '../../shared/domain/id'

export class SailShip {
  readonly id: string
  readonly dateTime: Date

  constructor (id: Id, dateTime: Date = new Date()) {
    this.id = id.value
    this.dateTime = dateTime
  }
}
