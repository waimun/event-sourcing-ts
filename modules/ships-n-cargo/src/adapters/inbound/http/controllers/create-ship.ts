import type { CreateShipDto } from '../../../../application/use-cases/create-ship/create-ship-dto'
import type { CreateShipUseCase } from '../../../../application/use-cases/create-ship/use-case'
import { Id } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { ExpectedError } from '../../../../shared/error'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class CreateShipController {
  useCase: CreateShipUseCase

  constructor(useCase: CreateShipUseCase) {
    this.useCase = useCase
  }

  async create(request: CreateShipDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.create(parsed.name, parsed.id)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_ALREADY_EXISTS':
          case 'CONCURRENT_COMMAND_CONFLICT':
            return expectedErrorResponse(result.error)
          default: {
            const unexpected: never = result.error
            return errorResponse(unexpected, request)
          }
        }
      }
      return { status: 201, dateTime: new Date() }
    } catch (error) {
      return errorResponse(error, request)
    }
  }
}

const parseRequest = (request: CreateShipDto) => {
  return { name: new Name(request.name), id: new Id(request.id) }
}
