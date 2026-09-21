import type { CreateShipDto } from '../../../application/use-cases/create-ship/create-ship-dto'
import type { CreateShipUseCase } from '../../../application/use-cases/create-ship/use-case'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { errorResponse } from './error-response'
import type { Response } from './response'

export class CreateShipController {
  useCase: CreateShipUseCase

  constructor(useCase: CreateShipUseCase) {
    this.useCase = useCase
  }

  async create(request: CreateShipDto): Promise<Response> {
    try {
      await this.useCase.create(new Name(request.name), new Id(request.id))
      return { status: 201, dateTime: new Date() }
    } catch (e) {
      return errorResponse(e, request)
    }
  }
}
