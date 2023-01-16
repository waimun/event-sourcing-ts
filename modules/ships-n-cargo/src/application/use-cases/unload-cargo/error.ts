import { InvalidArgumentError } from '../../../shared/error'

export class ShipNotFound extends InvalidArgumentError {
  constructor (id: string) {
    super(`Ship '${id}' does not exist to unload cargo`)
  }
}
