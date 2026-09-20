import { ISODate } from '../../../shared/domain/date'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'
import type { Response } from '../response'
import type { LoadCargoDto } from './load-cargo-dto'
import type { LoadCargoUseCase } from './use-case'

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
      if (e instanceof InvalidArgumentError) {
        return { status: 400, error: e.message, dateTime: new Date() }
      }

      console.error('%s\n', JSON.stringify(request), e)
      return { status: 500, error: new ApplicationError().message, dateTime: new Date() }
    }
  }
}
