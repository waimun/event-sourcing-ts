import { DockShipUseCase } from './use-case'
import { DockShipDto } from './dock-ship-dto'
import { Response } from '../response'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'

export class DockShipController {
  useCase: DockShipUseCase

  constructor (useCase: DockShipUseCase) {
    this.useCase = useCase
  }

  dock (request: DockShipDto): Response {
    try {
      this.useCase.dock(request)
      return { status: 200, dateTime: new Date() }
    } catch (e) {
      if (e instanceof InvalidArgumentError) {
        return { status: 400, error: e.message, dateTime: new Date() }
      }

      console.error('%s\n', request, e)
      return { status: 500, error: new ApplicationError().message, dateTime: new Date() }
    }
  }
}
