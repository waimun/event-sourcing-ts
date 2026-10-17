import { expect, test } from 'vitest'
import { BaseError, DomainError, ExpectedError } from './kernel'

class ExampleDomainError extends DomainError {
  constructor() {
    super({ code: 'EXAMPLE', kind: 'validation', message: 'Example', meta: { field: 'name' } })
  }
}

test('domain errors expose stable classification and immutable metadata', () => {
  const error = new ExampleDomainError()

  expect(error).toBeInstanceOf(BaseError)
  expect(error).toBeInstanceOf(ExpectedError)
  expect(error).toBeInstanceOf(DomainError)
  expect(error).toBeInstanceOf(Error)
  expect(error).toMatchObject({
    name: 'ExampleDomainError',
    domain: 'ships-n-cargo',
    code: 'EXAMPLE',
    kind: 'validation',
    message: 'Example',
    meta: { field: 'name' }
  })
  expect(Object.isFrozen(error.meta)).toBe(true)
})
