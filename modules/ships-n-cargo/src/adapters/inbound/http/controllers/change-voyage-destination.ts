import type { ChangeVoyageDestinationDto } from '../../../../application/use-cases/change-voyage-destination/change-voyage-destination-dto'
import type { ChangeVoyageDestinationUseCase } from '../../../../application/use-cases/change-voyage-destination/use-case'
import { Country } from '../../../../domain/country'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { VoyageChangeReason } from '../../../../domain/voyage-change-reason'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { isNotObject } from '../../../../shared/utils/object'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class ChangeVoyageDestinationController {
  constructor(private readonly useCase: ChangeVoyageDestinationUseCase) {}

  async change(request: ChangeVoyageDestinationDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.change(parsed.id, parsed.destination, parsed.reason)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'SHIP_NOT_AT_PORT':
          case 'VOYAGE_REQUIRED_TO_CHANGE_DESTINATION':
          case 'VOYAGE_DESTINATION_SAME_AS_ORIGIN':
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

const parseRequest = (request: ChangeVoyageDestinationDto) => {
  const id = new Id(request.id)
  if (isNotObject(request.destination)) throw new IsRequired('Destination')
  const destination = new Port(
    new PortName(request.destination.name),
    new Country(request.destination.country)
  )
  const reason = new VoyageChangeReason(request.reason)
  return { id, destination, reason }
}
