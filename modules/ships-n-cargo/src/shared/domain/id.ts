import { isEmptyString, trim } from '../utils/text'
import { InvalidArgumentError } from '../error'
import { IsRequired } from './errors/is-required'

export const isValidIdentifier = (id: string): boolean => /^[a-zA-Z0-9-]{1,36}$/.test(trim(id))

export class Id {
  public readonly value: string

  constructor (value: string) {
    if (isEmptyString(value)) throw new IsRequired('Id')
    if (!isValidIdentifier(value)) throw new IdNotAllowed(value)

    this.value = value
  }
}

export class IdNotAllowed extends InvalidArgumentError {
  constructor (value: string) {
    super(`Id ${value} is invalid: only 1-36 characters, alphanumeric, dashes are allowed`)
  }
}
