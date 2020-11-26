export enum Country {
  NO_COUNTRY,
  US,
  CANADA
}

export class Port {
  name: string
  country: Country

  constructor (name: string, country: Country) {
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

class AtSea extends Port {
  constructor () {
    super('AT_SEA', Country.NO_COUNTRY)
  }
}

class MissingPort extends Port {
  constructor () {
    super('MISSING_PORT', Country.NO_COUNTRY)
  }
}
