import { AtSea, Country, MissingPort, Port } from '../port'
import { CannotDockShipAtSea, CannotDockWithoutPort, NoCountrySpecifiedForPort } from '../errors/dock-ship'
import { IdIsRequired, IdNotAllowed, isValidIdentifier } from '../../shared/validators/id'
import { isEmptyString } from '../../shared/utils/text'

export class DockShip {
  readonly id: string
  readonly port: Port
  readonly dateTime: Date

  constructor (id: string, port: Port, dateTime: Date = new Date()) {
    if (isEmptyString(id)) throw new IdIsRequired()
    if (!isValidIdentifier(id)) throw new IdNotAllowed()
    if (AtSea.equals(port)) throw new CannotDockShipAtSea()
    if (MissingPort.equals(port)) throw new CannotDockWithoutPort()
    if (port.country === Country.NO_COUNTRY) throw new NoCountrySpecifiedForPort()

    this.id = id
    this.port = port
    this.dateTime = dateTime
  }
}
