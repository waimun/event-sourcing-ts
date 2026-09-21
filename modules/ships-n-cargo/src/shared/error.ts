export type ErrorDomain = 'ships-n-cargo'
export type DomainErrorKind = 'validation' | 'not-found' | 'conflict'
export type InfrastructureErrorKind = 'fatal'
export type InvariantErrorKind = 'invariant'
export type ErrorKind = DomainErrorKind | InfrastructureErrorKind | InvariantErrorKind
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

export abstract class DomainError extends BaseError {
  protected constructor(options: Omit<BaseErrorOptions, 'kind'> & { kind: DomainErrorKind }) {
    super(options)
  }
}

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

export type EventJournalOperation = 'append' | 'eventsByAggregate'

export class EventJournalUnavailable extends InfrastructureError {
  constructor(operation: EventJournalOperation, cause: unknown) {
    super({
      code: 'EVENT_JOURNAL_UNAVAILABLE',
      message: `Event journal is unavailable during '${operation}'`,
      meta: { operation },
      cause
    })
  }
}
