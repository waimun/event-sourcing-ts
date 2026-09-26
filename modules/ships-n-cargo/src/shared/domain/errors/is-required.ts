import { DomainError } from '../../errors/kernel'

export class IsRequired extends DomainError {
  declare readonly code: 'REQUIRED_VALUE'
  constructor(what: string) {
    super({
      code: 'REQUIRED_VALUE',
      kind: 'validation',
      message: `${what} is required`,
      meta: { field: what }
    })
  }
}
