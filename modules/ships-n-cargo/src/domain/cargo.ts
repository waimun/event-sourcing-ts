import { ShipArrived } from './events/ship-arrived'
import { Country } from './country'

export class Cargo {
  name: string
  hasBeenInCanada: boolean = false

  constructor (name: string) {
    this.name = name
  }

  static handleArrival (current: Cargo, event: ShipArrived): Cargo {
    const nextState = new Cargo(current.name)
    nextState.hasBeenInCanada = current.hasBeenInCanada
    if (Country.CANADA === event.port.country) nextState.hasBeenInCanada = true
    return nextState
  }
}
