import type { PlanVoyageDto } from '../../../../application/use-cases/plan-voyage/plan-voyage-dto'
import type { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import { Country } from '../../../../domain/country'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { isNotObject } from '../../../../shared/utils/object'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class PlanVoyageController {
  constructor(private readonly useCase: PlanVoyageUseCase) {}

  async plan(request: PlanVoyageDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.plan(parsed.id, parsed.destination)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'SHIP_NOT_AT_PORT':
          case 'VOYAGE_ALREADY_PLANNED':
          case 'VOYAGE_DESTINATION_SAME_AS_ORIGIN':
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

const parseRequest = (request: PlanVoyageDto) => {
  const id = new Id(request.id)
  if (isNotObject(request.destination)) throw new IsRequired('Destination')
  const destination = new Port(
    new PortName(request.destination.name),
    new Country(request.destination.country)
  )
  return { id, destination }
}
