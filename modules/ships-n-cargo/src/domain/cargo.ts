import { Name } from '../shared/domain/name'
import { EnumCountry } from './country'
import type { ShipArrived } from './events/ship-arrived'

export class Cargo {
  readonly name: string
  private _hasBeenInCanada: boolean = false

  constructor(name: Name) {
    this.name = name.value
  }

  get hasBeenInCanada(): boolean {
    return this._hasBeenInCanada
  }

  static handleArrival(current: Cargo, event: ShipArrived): Cargo {
    const nextState = new Cargo(new Name(current.name))
    nextState._hasBeenInCanada = current.hasBeenInCanada
    if (EnumCountry.CANADA === event.port.country) nextState._hasBeenInCanada = true
    return nextState
  }
}
