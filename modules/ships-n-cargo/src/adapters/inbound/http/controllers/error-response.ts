import { BaseError, type ErrorKind, ExpectedError } from '../../../../shared/error'
import type { Response } from './response'

export const opaqueApplicationErrorMessage =
  'An unknown error has occurred in the application; please retry'

const statusByKind: Record<ErrorKind, number> = {
  validation: 400,
  'not-found': 404,
  conflict: 409,
  fatal: 500,
  invariant: 500
}

export const errorResponse = (error: unknown, context: unknown): Response => {
  if (error instanceof ExpectedError) {
    return {
      status: statusByKind[error.kind],
      error: error.message,
      dateTime: new Date()
    }
  }

  console.error('%s\n', JSON.stringify(context), error)

  return {
    status: error instanceof BaseError ? statusByKind[error.kind] : 500,
    error: opaqueApplicationErrorMessage,
    dateTime: new Date()
  }
}
