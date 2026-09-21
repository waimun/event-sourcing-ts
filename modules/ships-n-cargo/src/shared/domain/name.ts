import { DomainError } from '../error'
import { isEmptyString, trim } from '../utils/text'
import { IsRequired } from './errors/is-required'

export const isValidName = (name: string): boolean => /^[\w- ]{3,50}$/.test(trim(name))

export class Name {
  public readonly value: string

  constructor(value: string, kind: string = 'Name') {
    if (isEmptyString(value)) throw new IsRequired(kind)
    if (!isValidName(value)) throw new NameNotAllowed(value, kind)

    this.value = trim(value)
  }
}

export class NameNotAllowed extends DomainError {
  constructor(value: string, kind: string = 'Name') {
    super({
      code: 'INVALID_NAME',
      kind: 'validation',
      message: `${kind} '${value}' is invalid: only 3-50 characters, alphanumeric, underscores, dashes, spaces are allowed`,
      meta: { field: kind, value }
    })
  }
}
