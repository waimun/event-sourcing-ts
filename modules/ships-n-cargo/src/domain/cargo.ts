import { ShipArrived } from './events/ship-arrived'
import { EnumCountry } from './country'

export class Cargo {
  name: string
  hasBeenInCanada: boolean = false

  constructor (name: string) {
    this.name = name
  }

  static handleArrival (current: Cargo, event: ShipArrived): Cargo {
    const nextState = new Cargo(current.name)
    nextState.hasBeenInCanada = current.hasBeenInCanada
    if (EnumCountry.CANADA === event.port.country) nextState.hasBeenInCanada = true
    return nextState
  }
}
