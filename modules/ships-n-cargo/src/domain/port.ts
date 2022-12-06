import { isValidName, NameIsRequired, NameNotAllowed } from '../shared/validators/name'
import { isEmptyString } from '../shared/utils/text'

export enum Country {
  NO_COUNTRY,
  US,
  CANADA
}

export class Port {
  readonly name: string
  readonly country: Country

  constructor (name: string, country: Country) {
    if (isEmptyString(name)) throw new NameIsRequired()
    if (!isValidName(name)) throw new NameNotAllowed()

    this.name = name
    this.country = country
  }

  static atSea (): Port {
    return new AtSea()
  }

  static none (): Port {
    return new MissingPort()
  }
}

export class AtSea extends Port {
  private static readonly _name: string = 'AT_SEA'

  constructor () {
    super(AtSea._name, Country.NO_COUNTRY)
  }

  static equals (port: Port): boolean {
    return AtSea._name === port?.name && Country.NO_COUNTRY === port?.country
  }
}

export class MissingPort extends Port {
  private static readonly _name: string = 'MISSING_PORT'

  constructor () {
    super(MissingPort._name, Country.NO_COUNTRY)
  }

  static equals (port: Port): boolean {
    return MissingPort._name === port?.name && Country.NO_COUNTRY === port?.country
  }
}
