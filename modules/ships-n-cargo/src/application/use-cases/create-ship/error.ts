import { InvalidArgumentError } from '../../../shared/error'

export class IdAlreadyExists extends InvalidArgumentError {
  constructor (id: string) {
    super(`Id '${id}' already exists`)
  }
}
