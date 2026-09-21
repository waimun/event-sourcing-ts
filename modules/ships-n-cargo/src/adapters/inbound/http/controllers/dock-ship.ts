import type { DockShipDto } from '../../../../application/use-cases/dock-ship/dock-ship-dto'
import type { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import { Country } from '../../../../domain/country'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { ISODate } from '../../../../shared/domain/date'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/error'
import { isNotObject } from '../../../../shared/utils/object'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class DockShipController {
  useCase: DockShipUseCase

  constructor(useCase: DockShipUseCase) {
    this.useCase = useCase
  }

  async dock(request: DockShipDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.dock(parsed.id, parsed.port, parsed.dateTime)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'CANNOT_DOCK_AT_SEA':
          case 'CANNOT_DOCK_WITHOUT_PORT':
          case 'PORT_COUNTRY_REQUIRED':
            return expectedErrorResponse(result.error)
          default: {
            const unexpected: never = result.error
            return errorResponse(unexpected, request)
          }
        }
      }
      return { status: 200, dateTime: new Date() }
    } catch (error) {
      return errorResponse(error, request)
    }
  }
}

const parseRequest = (request: DockShipDto) => {
  const id = new Id(request.id)
  if (isNotObject(request.port)) throw new IsRequired('Port')
  const port = new Port(new PortName(request.port.name), new Country(request.port.country))
  const dateTime = new ISODate(request.dateTime)
  return { id, port, dateTime }
}
