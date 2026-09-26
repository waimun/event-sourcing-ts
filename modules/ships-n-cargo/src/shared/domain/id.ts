import { DomainError } from '../errors/kernel'
import { isEmptyString, trim } from '../utils/text'
import { IsRequired } from './errors/is-required'

export const isValidIdentifier = (id: string): boolean => /^[a-zA-Z0-9-]{1,36}$/.test(trim(id))

export class Id {
  public readonly value: string

  constructor(value: string, kind: string = 'Id') {
    if (isEmptyString(value)) throw new IsRequired(kind)
    if (!isValidIdentifier(value)) throw new IdNotAllowed(value, kind)

    this.value = trim(value)
  }
}

export class IdNotAllowed extends DomainError {
  declare readonly code: 'INVALID_IDENTIFIER'
  constructor(value: string, kind: string = 'Id') {
    super({
      code: 'INVALID_IDENTIFIER',
      kind: 'validation',
      message: `${kind} ${value} is invalid: only 1-36 characters, alphanumeric, dashes are allowed`,
      meta: { field: kind, value }
    })
  }
}
