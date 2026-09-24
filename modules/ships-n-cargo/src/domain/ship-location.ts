import type { Port } from './port'

export class AtPort {
  readonly kind = 'at-port'
  readonly port: Port

  constructor(port: Port) {
    this.port = port
    Object.freeze(this)
  }
}

export class AtSea {
  readonly kind = 'at-sea'

  constructor() {
    Object.freeze(this)
  }
}

export type ShipLocation = AtPort | AtSea
