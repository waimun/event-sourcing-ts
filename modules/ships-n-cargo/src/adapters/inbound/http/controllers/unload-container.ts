import type { UnloadContainerDto } from '../../../../application/use-cases/unload-container/unload-container-dto'
import type { UnloadContainerUseCase } from '../../../../application/use-cases/unload-container/use-case'
import { Id } from '../../../../shared/domain/id'
import { ExpectedError } from '../../../../shared/errors/kernel'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class UnloadContainerController {
  useCase: UnloadContainerUseCase

  constructor(useCase: UnloadContainerUseCase) {
    this.useCase = useCase
  }

  async unloadContainer(request: UnloadContainerDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.unload(parsed.id, parsed.containerId)
      if (!result.ok) {
        switch (result.error.code) {
          case 'SHIP_NOT_FOUND':
          case 'CONTAINER_NOT_FOUND':
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

const parseRequest = (request: UnloadContainerDto) => {
  return {
    id: new Id(request.id),
    containerId: new Id(request.containerId, 'Container ID')
  }
}
