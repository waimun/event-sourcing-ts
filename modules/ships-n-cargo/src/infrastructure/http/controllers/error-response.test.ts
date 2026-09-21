import { expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../application/errors/ship-not-found'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { EventJournalUnavailable, InvariantError } from '../../../shared/error'
import { errorResponse, opaqueApplicationErrorMessage } from './error-response'

class ImpossibleState extends InvariantError {
  constructor() {
    super({ code: 'IMPOSSIBLE_STATE', message: 'internal detail', meta: { secret: 'value' } })
  }
}

test.each([
  [new IsRequired('Id'), 400, 'Id is required'],
  [new ShipNotFound('abc'), 404, "Ship 'abc' does not exist"]
] as const)(
  'maps expected outcomes to their semantic status and safe message',
  (error, status, message) => {
    expect(errorResponse(error, {})).toMatchObject({ status, error: message })
  }
)

test.each([
  new EventJournalUnavailable('append', new Error('driver detail')),
  new ImpossibleState(),
  new Error('unexpected detail'),
  'non-error thrown value'
])('logs and hides unsafe failures', (error) => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  expect(errorResponse(error, { id: 'abc' })).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
  expect(consoleError).toHaveBeenCalledWith('%s\n', JSON.stringify({ id: 'abc' }), error)

  consoleError.mockRestore()
})
