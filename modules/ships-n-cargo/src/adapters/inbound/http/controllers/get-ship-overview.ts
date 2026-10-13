import type { GetShipOverviewDto } from '../../../../application/use-cases/get-ship-overview/get-ship-overview-dto'
import type { GetShipOverviewUseCase } from '../../../../application/use-cases/get-ship-overview/use-case'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class GetShipOverviewController {
  constructor(private readonly useCase: GetShipOverviewUseCase) {}

  async get(request: GetShipOverviewDto): Promise<Response> {
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
