import { Country, EnumCountry } from './country'
import { PortName } from './port-name'

export class Port {
  readonly name: string
  readonly country: EnumCountry

  constructor (name: PortName, country: Country) {
    this.name = name.value
    this.country = country.value
  }

  static atSea (): Port {
    return new AtSea()
  }

  static none (): Port {
    return new MissingPort()
  }
}

export class AtSea extends Port {
  private static readonly _name: PortName = new PortName('AT_SEA')

  constructor () {
    super(AtSea._name, new Country('NO_COUNTRY'))
  }

  static equals (port: Port): boolean {
    return AtSea._name.value === port?.name && EnumCountry.NO_COUNTRY === port?.country
  }
}

export class MissingPort extends Port {
  private static readonly _name: PortName = new PortName('MISSING_PORT')

  constructor () {
    super(MissingPort._name, new Country('NO_COUNTRY'))
  }

  static equals (port: Port): boolean {
    return MissingPort._name.value === port?.name && EnumCountry.NO_COUNTRY === port?.country
  }
}
