import { InfrastructureError, InvariantError } from '../../../../shared/errors/kernel'

export class InvalidShipOverviewHistory extends InvariantError {
  constructor(eventType: string, shipId: string, reason: string) {
    super({
      code: 'INVALID_SHIP_OVERVIEW_HISTORY',
      message: `Ship overview cannot apply '${eventType}' for ship '${shipId}': ${reason}`,
      meta: { eventType, shipId, reason }
    })
  }
}

export class ShipOverviewProjectionUnavailable extends InfrastructureError {
  constructor(cause: unknown) {
    super({
      code: 'SHIP_OVERVIEW_PROJECTION_UNAVAILABLE',
      message: 'Ship overview projection is unavailable',
      cause
    })
  }
}
