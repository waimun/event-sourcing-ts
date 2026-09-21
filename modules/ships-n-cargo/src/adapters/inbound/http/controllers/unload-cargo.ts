import type { UnloadCargoDto } from '../../../../application/use-cases/unload-cargo/unload-cargo-dto'
import type { UnloadCargoUseCase } from '../../../../application/use-cases/unload-cargo/use-case'
import { ISODate } from '../../../../shared/domain/date'
import { Id } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { errorResponse } from './error-response'
import type { Response } from './response'

export class UnloadCargoController {
  useCase: UnloadCargoUseCase

  constructor(useCase: UnloadCargoUseCase) {
    this.useCase = useCase
  }

  async unloadCargo(request: UnloadCargoDto): Promise<Response> {
    try {
      const id = new Id(request.id)
      const cargoName = new Name(request.cargoName, 'Cargo name')
      const dateTime = new ISODate(request.dateTime)
      await this.useCase.unload(id, cargoName, dateTime)
      return { status: 200, dateTime: new Date() }
    } catch (e) {
      return errorResponse(e, request)
    }
  }
}
