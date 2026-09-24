import { DomainError, InvariantError } from '../../shared/error'

export class UnregisteredShipRequiredToRegister extends InvariantError {
  constructor() {
    super({
      code: 'SHIP_ALREADY_REGISTERED',
      message: 'Ship is already registered'
    })
  }
}

export class ShipMustBeRegisteredFirst extends InvariantError {
  constructor() {
    super({ code: 'SHIP_NOT_REGISTERED', message: 'Register ship first' })
  }
}

export class IdsMismatch extends InvariantError {
  constructor() {
    super({
      code: 'AGGREGATE_ID_MISMATCH',
      message: 'IDs of command and aggregate objects must be identical'
    })
  }
}

export class ShipNotAtPort extends DomainError {
  declare readonly code: 'SHIP_NOT_AT_PORT'
  constructor() {
    super({
      code: 'SHIP_NOT_AT_PORT',
      kind: 'conflict',
      message: 'Ship must be at a port to depart'
    })
  }
}

export class ShipNotAtSea extends DomainError {
  declare readonly code: 'SHIP_NOT_AT_SEA'
  constructor() {
    super({
      code: 'SHIP_NOT_AT_SEA',
      kind: 'conflict',
      message: 'Ship must be at sea to arrive'
    })
  }
}

export class CargoAlreadyLoaded extends DomainError {
  declare readonly code: 'CARGO_ALREADY_LOADED'
  constructor(cargoName: string) {
    super({
      code: 'CARGO_ALREADY_LOADED',
      kind: 'conflict',
      message: `Cargo '${cargoName}' is already loaded`,
      meta: { cargoName }
    })
  }
}

export class CargoNotFound extends DomainError {
  declare readonly code: 'CARGO_NOT_FOUND'
  constructor(cargoName: string) {
    super({
      code: 'CARGO_NOT_FOUND',
      kind: 'not-found',
      message: `Cannot find cargo '${cargoName}'`,
      meta: { cargoName }
    })
  }
}

export class InvalidShipHistory extends InvariantError {
  constructor(eventType: string, aggregateId: string, reason: string) {
    super({
      code: 'INVALID_SHIP_HISTORY',
      message: `Cannot replay '${eventType}' for ship '${aggregateId}': ${reason}`,
      meta: { eventType, aggregateId, reason }
    })
  }
}
