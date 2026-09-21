import type { LoadCargoDto } from '../../../../application/use-cases/load-cargo/load-cargo-dto'
import type { LoadCargoUseCase } from '../../../../application/use-cases/load-cargo/use-case'
import { ISODate } from '../../../../shared/domain/date'
import { Id } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { ExpectedError } from '../../../../shared/error'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class LoadCargoController {
  useCase: LoadCargoUseCase

  constructor(useCase: LoadCargoUseCase) {
    this.useCase = useCase
  }

  async loadCargo(request: LoadCargoDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.load(parsed.id, parsed.cargoName, parsed.dateTime)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'CARGO_ALREADY_LOADED':
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

const parseRequest = (request: LoadCargoDto) => {
  return {
    id: new Id(request.id),
    cargoName: new Name(request.cargoName, 'Cargo name'),
    dateTime: new ISODate(request.dateTime)
  }
}
