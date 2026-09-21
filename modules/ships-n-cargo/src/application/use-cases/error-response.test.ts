import { expect, test, vi } from 'vitest'
import { EventJournalUnavailable, InvariantError } from '../../shared/error'
import { ShipNotFound } from './error'
import { errorResponse, opaqueApplicationErrorMessage } from './error-response'

class ImpossibleState extends InvariantError {
  constructor() {
    super({ code: 'IMPOSSIBLE_STATE', message: 'internal detail', meta: { secret: 'value' } })
  }
}

test('maps expected domain outcomes to their semantic status and safe message', () => {
  expect(errorResponse(new ShipNotFound('abc'), {})).toMatchObject({
    status: 404,
    error: "Ship 'abc' does not exist"
  })
})

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
