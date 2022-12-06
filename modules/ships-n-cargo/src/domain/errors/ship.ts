export class UninitializedShipRequiredToCreate extends Error {
  constructor () {
    super('Uninitialized state is required to create')
  }
}

export class ShipMustBeCreatedFirst extends Error {
  constructor () {
    super('Create ship first!')
  }
}

export class IdsMismatch extends Error {
  constructor () {
    super('IDs of command and aggregate objects must be identical')
  }
}

export class InvalidPortForDeparture extends Error {
  constructor () {
    super('Ship cannot depart from a missing port or at sea')
  }
}

export class CargoAlreadyLoaded extends Error {
  constructor () {
    super('Cargo is already loaded')
  }
}

export class CargoNotFound extends Error {
  constructor (cargoName: string) {
    super(`Cannot find cargo '${cargoName}'`)
  }
}
