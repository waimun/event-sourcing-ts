import { Name } from '../shared/domain/name'
import { EnumCountry } from './country'
import type { ShipArrived } from './events/ship-arrived'

export class Cargo {
  readonly name: string
  readonly #hasBeenInCanada: boolean

  constructor(name: Name, hasBeenInCanada: boolean = false) {
    this.name = name.value
    this.#hasBeenInCanada = hasBeenInCanada
    Object.freeze(this)
  }

  get hasBeenInCanada(): boolean {
    return this.#hasBeenInCanada
  }

  static handleArrival(current: Cargo, event: ShipArrived): Cargo {
    return new Cargo(
      new Name(current.name),
      current.hasBeenInCanada || EnumCountry.CANADA === event.port.country
    )
  }
}
