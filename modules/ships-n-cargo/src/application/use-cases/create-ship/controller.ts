import { CreateShipUseCase } from './use-case'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'
import { Response } from '../response'
import { CreateShipDto } from './create-ship-dto'

export class CreateShipController {
  useCase: CreateShipUseCase

  constructor (useCase: CreateShipUseCase) {
    this.useCase = useCase
  }

  create (request: CreateShipDto): Response {
    try {
      this.useCase.create(request)
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
