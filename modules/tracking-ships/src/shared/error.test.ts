import { expect, test } from '@jest/globals'
import { ApplicationError } from './error'

test('construct ApplicationError object', () => {
  const appError = new ApplicationError()
  expect(appError).toBeTruthy()
  expect(appError.message).toEqual('An unknown error has occurred in the application; please retry')
})
