import { ISODate } from '../../../shared/domain/date'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { errorResponse } from '../error-response'
import type { Response } from '../response'
import type { UnloadCargoDto } from './unload-cargo-dto'
import type { UnloadCargoUseCase } from './use-case'

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
