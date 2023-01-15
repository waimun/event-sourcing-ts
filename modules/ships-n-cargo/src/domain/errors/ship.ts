import { InvalidArgumentError } from '../../shared/error'

export class UninitializedShipRequiredToCreate extends InvalidArgumentError {
  constructor () {
    super('Uninitialized state is required to create')
  }
}

export class ShipMustBeCreatedFirst extends InvalidArgumentError {
  constructor () {
    super('Create ship first!')
  }
}

export class IdsMismatch extends InvalidArgumentError {
  constructor () {
    super('IDs of command and aggregate objects must be identical')
  }
}

export class InvalidPortForDeparture extends InvalidArgumentError {
  constructor () {
    super('Ship cannot depart from a missing port or at sea')
  }
}

export class CargoAlreadyLoaded extends InvalidArgumentError {
  constructor (cargoName: string) {
    super(`Cargo '${cargoName}' is already loaded`)
  }
}

export class CargoNotFound extends InvalidArgumentError {
  constructor (cargoName: string) {
    super(`Cannot find cargo '${cargoName}'`)
  }
}
