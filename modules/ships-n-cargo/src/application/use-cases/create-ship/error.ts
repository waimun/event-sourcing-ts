import { DomainError } from '../../../shared/error'

export class IdAlreadyExists extends DomainError {
  constructor(id: string) {
    super({
      code: 'SHIP_ALREADY_EXISTS',
      kind: 'conflict',
      message: `Id '${id}' already exists`,
      meta: { shipId: id }
    })
  }
}
