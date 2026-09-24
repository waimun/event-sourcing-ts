import type { LoadContainerDto } from '../../../../application/use-cases/load-container/load-container-dto'
import type { LoadContainerUseCase } from '../../../../application/use-cases/load-container/use-case'
import { Id } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { ExpectedError } from '../../../../shared/error'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class LoadContainerController {
  useCase: LoadContainerUseCase

  constructor(useCase: LoadContainerUseCase) {
    this.useCase = useCase
  }

  async loadContainer(request: LoadContainerDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.load(parsed.id, parsed.containerId, parsed.description)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'CONTAINER_ALREADY_LOADED':
          case 'SHIP_NOT_AT_PORT':
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

const parseRequest = (request: LoadContainerDto) => {
  return {
    id: new Id(request.id),
    containerId: new Id(request.containerId, 'Container ID'),
    description: new Name(request.description, 'Container description')
  }
}
