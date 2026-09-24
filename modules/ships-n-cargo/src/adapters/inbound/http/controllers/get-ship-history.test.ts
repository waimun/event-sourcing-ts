import { expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import type { ShipHistoryProjection } from '../../../../application/ports/ship-history-projection'
import { GetShipHistoryQuery } from '../../../../application/queries/get-ship-history/query'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { EventJournalUnavailable } from '../../../../shared/error'
import { opaqueApplicationErrorMessage } from './error-response'
import { GetShipHistoryController } from './get-ship-history'

const controllerFor = (projection: ShipHistoryProjection) =>
  new GetShipHistoryController(new GetShipHistoryQuery(projection))

test('returns a stable projected history', async () => {
  const history = {
    shipId: 'ship-1',
    history: [{ kind: 'ship-departed', occurredAt: '2026-09-24T12:00:00.000Z' }] as const
  }
  const response = await controllerFor({
    historyFor: vi.fn().mockResolvedValue(history)
  }).get({ id: 'ship-1' })

  expect(response).toEqual({ status: 200, body: history, dateTime: expect.any(Date) })
})

test('validates the ship id', async () => {
  const projection = { historyFor: vi.fn() }

  const response = await controllerFor(projection).get({ id: '' })

  expect(response).toMatchObject({ status: 400, error: new IsRequired('Id').message })
  expect(projection.historyFor).not.toHaveBeenCalled()
})

test('returns not found when the ship has no history', async () => {
  const response = await controllerFor({
    historyFor: vi.fn().mockResolvedValue(undefined)
  }).get({ id: 'missing' })

  expect(response).toMatchObject({ status: 404, error: new ShipNotFound('missing').message })
})

test('hides projection failures', async () => {
  const failure = new EventJournalUnavailable('eventsByAggregate', new Error('database detail'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const response = await controllerFor({
    historyFor: vi.fn().mockRejectedValue(failure)
  }).get({ id: 'ship-1' })

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
  expect(response.error).not.toContain('database detail')
})

test('hides an unexpected request parsing failure', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const response = await controllerFor({ historyFor: vi.fn() }).get(null as never)

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})
