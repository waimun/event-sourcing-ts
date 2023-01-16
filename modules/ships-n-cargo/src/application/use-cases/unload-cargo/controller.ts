import { UnloadCargoUseCase } from './use-case'
import { UnloadCargoDto } from './unload-cargo-dto'
import { Response } from '../response'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { ISODate } from '../../../shared/domain/date'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'

export class UnloadCargoController {
  useCase: UnloadCargoUseCase

  constructor (useCase: UnloadCargoUseCase) {
    this.useCase = useCase
  }

  unloadCargo (request: UnloadCargoDto): Response {
    try {
      const id = new Id(request.id)
      const cargoName = new Name(request.cargoName, 'Cargo name')
      const dateTime = new ISODate(request.dateTime)
      this.useCase.unload(id, cargoName, dateTime)
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
