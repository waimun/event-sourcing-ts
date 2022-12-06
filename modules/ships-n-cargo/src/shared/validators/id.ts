import { trim } from '../utils/text'
import { InvalidArgumentError } from '../error'

export const isValidIdentifier = (id: string): boolean => /^[a-zA-Z0-9-]{1,36}$/.test(trim(id))

export class IdNotAllowed extends InvalidArgumentError {
  constructor () {
    super('Invalid Id; 1-36 characters, only alphanumeric, dashes are allowed')
  }
}

export class IdIsRequired extends InvalidArgumentError {
  constructor () {
    super('Id is required')
  }
}
