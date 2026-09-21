import type { SailShipDto } from '../../../../application/use-cases/sail-ship/sail-ship-dto'
import type { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { ISODate } from '../../../../shared/domain/date'
import { Id } from '../../../../shared/domain/id'
import { errorResponse } from './error-response'
import type { Response } from './response'

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
