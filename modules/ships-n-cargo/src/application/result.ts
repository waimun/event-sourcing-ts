import type { ExpectedError } from '../shared/error'

export type Result<Success, Failure extends ExpectedError> =
  | { readonly ok: true; readonly value: Success }
  | { readonly ok: false; readonly error: Failure }

export function success(): Result<void, never>
export function success<Success>(value: Success): Result<Success, never>
export function success<Success>(value?: Success): Result<Success | undefined, never> {
  return { ok: true, value }
}

export const failure = <Failure extends ExpectedError>(error: Failure): Result<never, Failure> => ({
  ok: false,
  error
})
