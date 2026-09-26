import { InvariantError } from '../../../../shared/errors/kernel'

export class UnsupportedShipHistoryEvent extends InvariantError {
  constructor(eventType: string) {
    super({
      code: 'UNSUPPORTED_SHIP_HISTORY_EVENT',
      message: `Ship history cannot project event type '${eventType}'`,
      meta: { eventType }
    })
  }
}
