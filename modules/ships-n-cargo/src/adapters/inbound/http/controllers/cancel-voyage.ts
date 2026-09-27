import type { CancelVoyageDto } from '../../../../application/use-cases/cancel-voyage/cancel-voyage-dto'
import type { CancelVoyageUseCase } from '../../../../application/use-cases/cancel-voyage/use-case'
import { VoyageChangeReason } from '../../../../domain/voyage-change-reason'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class CancelVoyageController {
  constructor(private readonly useCase: CancelVoyageUseCase) {}

  async cancel(request: CancelVoyageDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.cancel(parsed.id, parsed.reason)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'SHIP_NOT_AT_PORT':
          case 'VOYAGE_REQUIRED_TO_CANCEL':
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

const parseRequest = (request: CancelVoyageDto) => ({
  id: new Id(request.id),
  reason: new VoyageChangeReason(request.reason)
})
