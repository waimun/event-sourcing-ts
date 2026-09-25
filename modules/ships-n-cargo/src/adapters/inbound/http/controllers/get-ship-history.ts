import type { GetShipHistoryDto } from '../../../../application/use-cases/get-ship-history/get-ship-history-dto'
import type { GetShipHistoryUseCase } from '../../../../application/use-cases/get-ship-history/use-case'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/error'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class GetShipHistoryController {
  constructor(private readonly useCase: GetShipHistoryUseCase) {}

  async get(request: GetShipHistoryDto): Promise<Response> {
    let id: Id
    try {
      id = new Id(request.id)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.execute(id)
      if (!result.ok) return expectedErrorResponse(result.error)
      return { status: 200, body: result.value, dateTime: new Date() }
    } catch (error) {
      return errorResponse(error, request)
    }
  }
}
