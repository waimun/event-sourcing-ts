export type ErrorDomain = 'ships-n-cargo'
export type ExpectedErrorKind = 'validation' | 'not-found' | 'conflict'
export type InfrastructureErrorKind = 'fatal'
export type InvariantErrorKind = 'invariant'
export type ErrorKind = ExpectedErrorKind | InfrastructureErrorKind | InvariantErrorKind
export type ErrorMeta = Readonly<Record<string, unknown>>

interface BaseErrorOptions {
  code: string
  kind: ErrorKind
  message: string
  meta?: Record<string, unknown>
  cause?: unknown
}

export abstract class BaseError extends Error {
  readonly domain: ErrorDomain = 'ships-n-cargo'
  readonly code: string
  readonly kind: ErrorKind
  readonly meta: ErrorMeta

  protected constructor({ code, kind, message, meta = {}, cause }: BaseErrorOptions) {
    super(message, { cause })
    this.name = new.target.name
    this.code = code
    this.kind = kind
    this.meta = Object.freeze({ ...meta })
  }
}

export abstract class ExpectedError extends BaseError {
  protected constructor(options: Omit<BaseErrorOptions, 'kind'> & { kind: ExpectedErrorKind }) {
    super(options)
  }
}

export abstract class DomainError extends ExpectedError {}

export abstract class ApplicationError extends ExpectedError {}

export abstract class InfrastructureError extends BaseError {
  protected constructor(options: Omit<BaseErrorOptions, 'kind'>) {
    super({ ...options, kind: 'fatal' })
  }
}

export abstract class InvariantError extends BaseError {
  protected constructor(options: Omit<BaseErrorOptions, 'kind'>) {
    super({ ...options, kind: 'invariant' })
  }
}
