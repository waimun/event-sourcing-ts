import { CreateShipRequest, CreateShipUseCase } from './use-case'
import { ApplicationError, InvalidArgumentError } from '../../../shared/error'

export interface HttpResponse {
  status: number
  body?: unknown
  error?: unknown
  dateTime: Date
}

export class CreateShipController {
  useCase: CreateShipUseCase

  constructor (useCase: CreateShipUseCase) {
    this.useCase = useCase
  }

  create (request: CreateShipRequest): HttpResponse {
    try {
      this.useCase.create(request)
      return { status: 201, dateTime: new Date() }
    } catch (e) {
      if (e instanceof InvalidArgumentError) {
        return { status: 400, error: e.message, dateTime: new Date() }
      }

      console.error(e)
      return { status: 500, error: new ApplicationError().message, dateTime: new Date() }
    }
  }
}
