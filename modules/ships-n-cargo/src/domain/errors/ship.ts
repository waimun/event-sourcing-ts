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
  constructor(operation: string = 'depart') {
    super({
      code: 'SHIP_NOT_AT_PORT',
      kind: 'conflict',
      message: `Ship must be at a port to ${operation}`,
      meta: { operation }
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

export class ContainerAlreadyLoaded extends DomainError {
  declare readonly code: 'CONTAINER_ALREADY_LOADED'
  constructor(containerId: string) {
    super({
      code: 'CONTAINER_ALREADY_LOADED',
      kind: 'conflict',
      message: `Container '${containerId}' is already loaded`,
      meta: { containerId }
    })
  }
}

export class ContainerNotFound extends DomainError {
  declare readonly code: 'CONTAINER_NOT_FOUND'
  constructor(containerId: string) {
    super({
      code: 'CONTAINER_NOT_FOUND',
      kind: 'not-found',
      message: `Cannot find container '${containerId}'`,
      meta: { containerId }
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
