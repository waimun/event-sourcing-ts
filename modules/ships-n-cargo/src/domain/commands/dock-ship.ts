import type { Id } from '../../shared/domain/id'
import { EnumCountry } from '../country'
import {
  CannotDockShipAtSea,
  CannotDockWithoutPort,
  NoCountrySpecifiedForPort
} from '../errors/dock-ship'
import { AtSea, MissingPort, type Port } from '../port'

export class DockShip {
  readonly id: string
  readonly port: Port
  readonly dateTime: Date

  constructor(id: Id, port: Port, dateTime: Date = new Date()) {
    if (AtSea.equals(port)) throw new CannotDockShipAtSea()
    if (MissingPort.equals(port)) throw new CannotDockWithoutPort()
    if (port.country === EnumCountry.NO_COUNTRY) throw new NoCountrySpecifiedForPort()

    this.id = id.value
    this.port = port
    this.dateTime = dateTime
  }
}
