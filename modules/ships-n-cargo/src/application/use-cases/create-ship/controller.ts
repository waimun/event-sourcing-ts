import { CreateShipUseCase } from './use-case'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'
import { Response } from '../response'
import { CreateShipDto } from './create-ship-dto'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'

export class CreateShipController {
  useCase: CreateShipUseCase

  constructor (useCase: CreateShipUseCase) {
    this.useCase = useCase
  }

  async create (request: CreateShipDto): Promise<Response> {
    try {
      await this.useCase.create(new Name(request.name), new Id(request.id))
      return { status: 201, dateTime: new Date() }
    } catch (e) {
      if (e instanceof InvalidArgumentError) {
        return { status: 400, error: e.message, dateTime: new Date() }
      }

      console.error('%s\n', JSON.stringify(request), e)
      return { status: 500, error: new ApplicationError().message, dateTime: new Date() }
    }
  }
}
