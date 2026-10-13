import { ApplicationError } from '../../shared/errors/kernel'

export class InvalidShipOverviewFilter extends ApplicationError {
  declare readonly code: 'INVALID_SHIP_OVERVIEW_FILTER'

  constructor(reason: string) {
    super({
      code: 'INVALID_SHIP_OVERVIEW_FILTER',
      kind: 'validation',
      message: `Ship overview filter is invalid: ${reason}`,
      meta: { reason }
    })
  }
}
