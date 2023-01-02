import { InvalidArgumentError } from '../../error'

export class IsRequired extends InvalidArgumentError {
  constructor (what: string) {
    super(`${what} is required`)
  }
}
