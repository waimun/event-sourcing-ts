import type { Id } from '../shared/domain/id'
import type { Name } from '../shared/domain/name'
import type { CargoReference } from './cargo-reference'

export class Container {
  readonly containerId: string
  readonly cargoReference: string
  readonly description: string

  constructor(containerId: Id, cargoReference: CargoReference, description: Name) {
    this.containerId = containerId.value
    this.cargoReference = cargoReference.value
    this.description = description.value
    Object.freeze(this)
  }
}
