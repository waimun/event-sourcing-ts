import type { SailShipDto } from '../../../../application/use-cases/sail-ship/sail-ship-dto'
import type { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class SailShipController {
  useCase: SailShipUseCase

  constructor(useCase: SailShipUseCase) {
    this.useCase = useCase
  }

  async sail(request: SailShipDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.sail(parsed.id)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'SHIP_NOT_AT_PORT':
          case 'VOYAGE_REQUIRED_TO_DEPART':
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

const parseRequest = (request: SailShipDto) => {
  return { id: new Id(request.id) }
}
