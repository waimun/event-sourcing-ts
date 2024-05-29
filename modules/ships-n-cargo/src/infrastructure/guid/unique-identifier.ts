import { UUID, uuidv7obj } from 'uuidv7'

export interface UniqueIdentifier {
  toString: () => string
}

export class Guid implements UniqueIdentifier {
  private readonly value: UUID

  constructor () {
    this.value = uuidv7obj()
  }

  toString (): string {
    return this.value.toHex()
  }
}
