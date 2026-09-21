import { DomainError } from '../../shared/error'

export class ShipNotFound extends DomainError {
  constructor(id: string) {
    super({
      code: 'SHIP_NOT_FOUND',
      kind: 'not-found',
      message: `Ship '${id}' does not exist`,
      meta: { shipId: id }
    })
  }
}
