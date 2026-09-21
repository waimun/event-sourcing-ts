import { DomainError } from '../../shared/error'
import { EnumCountry } from '../country'

export class CannotDockShipAtSea extends DomainError {
  constructor() {
    super({ code: 'CANNOT_DOCK_AT_SEA', kind: 'validation', message: 'Cannot dock ship at sea' })
  }
}

export class CannotDockWithoutPort extends DomainError {
  constructor() {
    super({
      code: 'CANNOT_DOCK_WITHOUT_PORT',
      kind: 'validation',
      message: 'Cannot dock ship without a port'
    })
  }
}

export class NoCountrySpecifiedForPort extends DomainError {
  constructor() {
    super({
      code: 'PORT_COUNTRY_REQUIRED',
      kind: 'validation',
      message: 'Cannot dock ship with no country specified for port'
    })
  }
}

export class InvalidCountry extends DomainError {
  constructor(country: string) {
    const countries = Object.entries(EnumCountry).map((e) => `${e[0]}(${e[1]})`)
    super({
      code: 'INVALID_COUNTRY',
      kind: 'validation',
      message: `Country '${country}' is not in the list of ${countries.join(',')}`,
      meta: { country }
    })
  }
}
