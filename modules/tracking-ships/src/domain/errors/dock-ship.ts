import { InvalidArgumentError } from '../../shared/error'

export class CannotDockShipAtSea extends InvalidArgumentError {
  constructor () {
    super('Cannot dock ship at sea')
  }
}

export class CannotDockWithoutPort extends InvalidArgumentError {
  constructor () {
    super('Cannot dock ship without a port')
  }
}

export class NoCountrySpecifiedForPort extends InvalidArgumentError {
  constructor () {
    super('Cannot dock ship with no country specified for port')
  }
}
