import { ISODate } from '../../../shared/domain/date'
import { Id } from '../../../shared/domain/id'
import { errorResponse } from '../error-response'
import type { Response } from '../response'
import type { SailShipDto } from './sail-ship-dto'
import type { SailShipUseCase } from './use-case'

export class SailShipController {
  useCase: SailShipUseCase

  constructor(useCase: SailShipUseCase) {
    this.useCase = useCase
  }

  async sail(request: SailShipDto): Promise<Response> {
    try {
      const id = new Id(request.id)
      const dateTime = new ISODate(request.dateTime)
      await this.useCase.sail(id, dateTime)
      return { status: 200, dateTime: new Date() }
    } catch (e) {
      return errorResponse(e, request)
    }
  }
}
