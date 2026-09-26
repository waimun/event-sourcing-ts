import type { DivertShipDto } from '../../../../application/use-cases/divert-ship/divert-ship-dto'
import type { DivertShipUseCase } from '../../../../application/use-cases/divert-ship/use-case'
import { Country } from '../../../../domain/country'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { isNotObject } from '../../../../shared/utils/object'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class DivertShipController {
  constructor(private readonly useCase: DivertShipUseCase) {}

  async divert(request: DivertShipDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.divert(parsed.id, parsed.destination)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'SHIP_NOT_AT_SEA':
          case 'VOYAGE_DESTINATION_UNCHANGED':
          case 'CONCURRENT_COMMAND_CONFLICT':
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

const parseRequest = (request: DivertShipDto) => {
  const id = new Id(request.id)
  if (isNotObject(request.destination)) throw new IsRequired('Destination')
  const destination = new Port(
    new PortName(request.destination.name),
    new Country(request.destination.country)
  )
  return { id, destination }
}
