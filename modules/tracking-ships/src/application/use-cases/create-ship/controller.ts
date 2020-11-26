import { CreateShipRequest, CreateShipUseCase } from './use-case'

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
    const result = this.useCase.create(request)
    return result.isSuccess
      ? { status: 201, body: request, dateTime: new Date() }
      : { status: 500, error: (result.getValue() as Error).message, dateTime: new Date() }
  }
}
