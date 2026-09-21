import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { errorResponse } from '../error-response'
import type { Response } from '../response'
import type { CreateShipDto } from './create-ship-dto'
import type { CreateShipUseCase } from './use-case'

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
