import { Cargo } from '../cargo'

export class LoadCargo {
  id: string
  dateTime: Date = new Date()
  cargo: Cargo

  constructor (id: string, cargo: Cargo, dateTime: Date = new Date()) {
    this.id = id
    this.dateTime = dateTime
    this.cargo = cargo
  }
}
