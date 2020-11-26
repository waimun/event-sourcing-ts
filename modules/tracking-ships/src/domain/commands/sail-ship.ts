export class SailShip {
  id: string
  dateTime: Date = new Date()

  constructor (id: string, dateTime: Date = new Date()) {
    this.id = id
    this.dateTime = dateTime
  }
}
