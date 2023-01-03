import { isEmptyString, trim } from '../utils/text'
import { IsRequired } from './errors/is-required'
import { InvalidArgumentError } from '../error'

export const isValidName = (name: string): boolean => /^[\w- ]{3,50}$/.test(trim(name))

export class Name {
  public readonly value: string

  constructor (value: string, kind: string = 'Name') {
    if (isEmptyString(value)) throw new IsRequired(kind)
    if (!isValidName(value)) throw new NameNotAllowed(value, kind)

    this.value = trim(value)
  }
}

export class NameNotAllowed extends InvalidArgumentError {
  constructor (value: string, kind: string = 'Name') {
    super(`${kind} '${value}' is invalid: only 3-50 characters, alphanumeric, underscores, dashes, spaces are allowed`)
  }
}
