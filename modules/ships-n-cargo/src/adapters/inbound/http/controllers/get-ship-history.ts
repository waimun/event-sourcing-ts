import type { GetShipHistoryDto } from '../../../../application/queries/get-ship-history/get-ship-history-dto'
import type { GetShipHistoryQuery } from '../../../../application/queries/get-ship-history/query'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/error'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class GetShipHistoryController {
  constructor(private readonly query: GetShipHistoryQuery) {}

  async get(request: GetShipHistoryDto): Promise<Response> {
    let id: Id
    try {
      id = new Id(request.id)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.query.execute(id)
      if (!result.ok) return expectedErrorResponse(result.error)
      return { status: 200, body: result.value, dateTime: new Date() }
    } catch (error) {
      return errorResponse(error, request)
    }
  }
}
