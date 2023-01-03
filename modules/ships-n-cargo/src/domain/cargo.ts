import { ShipArrived } from './events/ship-arrived'
import { EnumCountry } from './country'
import { Name } from '../shared/domain/name'

export class Cargo {
  name: string
  hasBeenInCanada: boolean = false

  constructor (name: Name) {
    this.name = name.value
  }

  static handleArrival (current: Cargo, event: ShipArrived): Cargo {
    const nextState = new Cargo(new Name(current.name))
    nextState.hasBeenInCanada = current.hasBeenInCanada
    if (EnumCountry.CANADA === event.port.country) nextState.hasBeenInCanada = true
    return nextState
  }
}
