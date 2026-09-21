import { ApplicationError } from '../../shared/error'

export class ShipNotFound extends ApplicationError {
  constructor(id: string) {
    super({
      code: 'SHIP_NOT_FOUND',
      kind: 'not-found',
      message: `Ship '${id}' does not exist`,
      meta: { shipId: id }
    })
  }
}
