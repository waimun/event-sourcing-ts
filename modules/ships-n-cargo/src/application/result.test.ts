import { expect, test } from 'vitest'
import { CargoAlreadyLoaded } from '../domain/errors/ship'
import { ShipNotFound } from './errors/ship-not-found'
import { failure, type Result, success } from './result'

test('distinguishes success and expected failure', () => {
  expect(success()).toEqual({ ok: true, value: undefined })
  expect(success(42)).toEqual({ ok: true, value: 42 })
  const error = new ShipNotFound('abc')
  expect(failure(error)).toEqual({ ok: false, error })
})

test('unlisted expected errors are rejected by a result contract', () => {
  // @ts-expect-error CargoAlreadyLoaded is not a declared failure of this result.
  const result: Result<void, ShipNotFound> = failure(new CargoAlreadyLoaded('book'))
  expect(result.ok).toBe(false)
})
