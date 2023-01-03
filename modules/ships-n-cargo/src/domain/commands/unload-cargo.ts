import { Cargo } from '../cargo'
import { Id } from '../../shared/domain/id'

export class UnloadCargo {
  id: string
  dateTime: Date = new Date()
  cargo: Cargo

  constructor (id: Id, cargo: Cargo, dateTime: Date = new Date()) {
    this.id = id.value
    this.dateTime = dateTime
    this.cargo = cargo
  }
}
