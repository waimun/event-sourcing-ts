import { Id } from '../shared/domain/id'

export class CargoReference {
  readonly value: string

  constructor(value: string) {
    this.value = new Id(value, 'Cargo reference').value
    Object.freeze(this)
  }
}
