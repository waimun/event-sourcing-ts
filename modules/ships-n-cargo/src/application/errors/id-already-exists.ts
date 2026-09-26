import { ApplicationError } from '../../shared/errors/kernel'

export class IdAlreadyExists extends ApplicationError {
  declare readonly code: 'SHIP_ALREADY_EXISTS'
  constructor(id: string) {
    super({
      code: 'SHIP_ALREADY_EXISTS',
      kind: 'conflict',
      message: `Id '${id}' already exists`,
      meta: { shipId: id }
    })
  }
}
