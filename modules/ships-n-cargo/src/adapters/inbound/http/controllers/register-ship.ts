import type { RegisterShipDto } from '../../../../application/use-cases/register-ship/register-ship-dto'
import type { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { Country } from '../../../../domain/country'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { ExpectedError } from '../../../../shared/error'
import { isNotObject } from '../../../../shared/utils/object'
import { errorResponse, expectedErrorResponse } from './error-response'
import type { Response } from './response'

export class RegisterShipController {
  useCase: RegisterShipUseCase

  constructor(useCase: RegisterShipUseCase) {
    this.useCase = useCase
  }

  async register(request: RegisterShipDto): Promise<Response> {
    let parsed: ReturnType<typeof parseRequest>
    try {
      parsed = parseRequest(request)
    } catch (error) {
      if (error instanceof ExpectedError) return expectedErrorResponse(error)
      return errorResponse(error, request)
    }

    try {
      const result = await this.useCase.register(parsed.name, parsed.id, parsed.port)
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

const parseRequest = (request: RegisterShipDto) => {
  const name = new Name(request.name)
  const id = new Id(request.id)
  if (isNotObject(request.port)) throw new IsRequired('Port')
  const port = new Port(new PortName(request.port.name), new Country(request.port.country))
  return { name, id, port }
}
