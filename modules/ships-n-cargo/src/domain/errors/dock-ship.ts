import { InvalidArgumentError } from '../../shared/error'
import { Country } from '../port'

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

export class InvalidCountry extends InvalidArgumentError {
  constructor (country: number) {
    const countries = Object.entries(Country).filter(e => typeof e[1] === 'number').map(e => `${e[0]}(${e[1]})`)
    super(`Country '${country}' is not in the list of ${countries.join(',')}`)
  }
}
