import type { LoadCargoDto } from '../../../application/use-cases/load-cargo/load-cargo-dto'
import type { LoadCargoUseCase } from '../../../application/use-cases/load-cargo/use-case'
import { ISODate } from '../../../shared/domain/date'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { errorResponse } from './error-response'
import type { Response } from './response'

export class LoadCargoController {
  useCase: LoadCargoUseCase

  constructor(useCase: LoadCargoUseCase) {
    this.useCase = useCase
  }

  async loadCargo(request: LoadCargoDto): Promise<Response> {
    try {
      const id = new Id(request.id)
      const cargoName = new Name(request.cargoName, 'Cargo name')
      const dateTime = new ISODate(request.dateTime)
      await this.useCase.load(id, cargoName, dateTime)
      return { status: 200, dateTime: new Date() }
    } catch (e) {
      return errorResponse(e, request)
    }
  }
}
