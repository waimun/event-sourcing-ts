import { trim } from '../utils/text'
import { InvalidArgumentError } from '../error'

export const isValidName = (name: string): boolean => /^[\w- ]{3,50}$/.test(trim(name))

export class NameNotAllowed extends InvalidArgumentError {
  constructor () {
    super('Invalid name; 3-50 characters, only alphanumeric, underscores, dashes, spaces are allowed')
  }
}

export class NameIsRequired extends InvalidArgumentError {
  constructor () {
    super('Name is required')
  }
}
