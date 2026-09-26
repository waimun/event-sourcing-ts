import { expect, test } from 'vitest'
import { ExpectedError, InfrastructureError } from '../../../shared/errors/kernel'
import { EventJournalUnavailable } from './event-journal-unavailable'

test('event journal failures retain operation and cause', () => {
  const cause = new Error('connection refused')
  const error = new EventJournalUnavailable('append', cause)

  expect(error).toBeInstanceOf(InfrastructureError)
  expect(error).not.toBeInstanceOf(ExpectedError)
  expect(error).toMatchObject({
    domain: 'ships-n-cargo',
    code: 'EVENT_JOURNAL_UNAVAILABLE',
    kind: 'fatal',
    meta: { operation: 'append' },
    cause
  })
})
