import { Country } from '../../../domain/country'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { ISODate } from '../../../shared/domain/date'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { Id } from '../../../shared/domain/id'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'
import { isNotObject } from '../../../shared/utils/object'
import type { Response } from '../response'
import type { DockShipDto } from './dock-ship-dto'
import type { DockShipUseCase } from './use-case'

export class DockShipController {
  useCase: DockShipUseCase

  constructor(useCase: DockShipUseCase) {
    this.useCase = useCase
  }

  async dock(request: DockShipDto): Promise<Response> {
    try {
      const id = new Id(request.id)
      if (isNotObject(request.port)) throw new IsRequired('Port')
      const port = new Port(new PortName(request.port.name), new Country(request.port.country))
      const dateTime = new ISODate(request.dateTime)
      await this.useCase.dock(id, port, dateTime)
      return { status: 200, dateTime: new Date() }
    } catch (e) {
      if (e instanceof InvalidArgumentError) {
        return { status: 400, error: e.message, dateTime: new Date() }
      }

      console.error('%s\n', JSON.stringify(request), e)
      return { status: 500, error: new ApplicationError().message, dateTime: new Date() }
    }
  }
}
