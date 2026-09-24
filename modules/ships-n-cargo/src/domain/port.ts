import type { Country, EnumCountry } from './country'
import type { PortName } from './port-name'

export class Port {
  readonly name: string
  readonly country: EnumCountry

  constructor(name: PortName, country: Country) {
    this.name = name.value
    this.country = country.value
    Object.freeze(this)
  }
}
