import { DomainError } from '../../error'

export class IsRequired extends DomainError {
  constructor(what: string) {
    super({
      code: 'REQUIRED_VALUE',
      kind: 'validation',
      message: `${what} is required`,
      meta: { field: what }
    })
  }
}
