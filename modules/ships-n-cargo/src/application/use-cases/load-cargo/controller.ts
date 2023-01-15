import { LoadCargoUseCase } from './use-case'
import { LoadCargoDto } from './load-cargo-dto'
import { Response } from '../response'
import { Id } from '../../../shared/domain/id'
import { ISODate } from '../../../shared/domain/date'
import { Name } from '../../../shared/domain/name'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'

export class LoadCargoController {
  useCase: LoadCargoUseCase

  constructor (useCase: LoadCargoUseCase) {
    this.useCase = useCase
  }

  loadCargo (request: LoadCargoDto): Response {
    try {
      const id = new Id(request.id)
      const cargoName = new Name(request.cargoName, 'Cargo name')
      const dateTime = new ISODate(request.dateTime)
      this.useCase.load(id, cargoName, dateTime)
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
