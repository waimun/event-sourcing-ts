import { Cargo } from '../cargo'
import { Id } from '../../shared/domain/id'

export class UnloadCargo {
  readonly id: string
  readonly dateTime: Date
  readonly cargo: Cargo

  constructor (id: Id, cargo: Cargo, dateTime: Date = new Date()) {
    this.id = id.value
    this.dateTime = dateTime
    this.cargo = cargo
  }
}
