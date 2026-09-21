import { ApplicationError } from '../../shared/error'

export class IdAlreadyExists extends ApplicationError {
  constructor(id: string) {
    super({
      code: 'SHIP_ALREADY_EXISTS',
      kind: 'conflict',
      message: `Id '${id}' already exists`,
      meta: { shipId: id }
    })
  }
}
