import { DomainError, InvariantError } from '../../shared/error'

export class UninitializedShipRequiredToCreate extends InvariantError {
  constructor() {
    super({
      code: 'SHIP_ALREADY_INITIALIZED',
      message: 'Uninitialized state is required to create'
    })
  }
}

export class ShipMustBeCreatedFirst extends InvariantError {
  constructor() {
    super({ code: 'SHIP_NOT_INITIALIZED', message: 'Create ship first!' })
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

export class InvalidPortForDeparture extends DomainError {
  constructor() {
    super({
      code: 'INVALID_PORT_FOR_DEPARTURE',
      kind: 'conflict',
      message: 'Ship cannot depart from a missing port or at sea'
    })
  }
}

export class CargoAlreadyLoaded extends DomainError {
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
  constructor(cargoName: string) {
    super({
      code: 'CARGO_NOT_FOUND',
      kind: 'not-found',
      message: `Cannot find cargo '${cargoName}'`,
      meta: { cargoName }
    })
  }
}
