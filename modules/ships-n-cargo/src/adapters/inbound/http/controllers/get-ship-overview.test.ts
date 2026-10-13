import { expect, test, vi } from 'vitest'
import type { ShipOverviewQueries } from '../../../../application/ports/ship-overview-projection'
import { GetShipOverviewUseCase } from '../../../../application/use-cases/get-ship-overview/use-case'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { ShipOverviewProjectionUnavailable } from '../../../outbound/projections/errors/ship-overview'
import { opaqueApplicationErrorMessage } from './error-response'
import { GetShipOverviewController } from './get-ship-overview'

const controllerFor = (queries: ShipOverviewQueries) =>
  new GetShipOverviewController(new GetShipOverviewUseCase(queries))

const queriesWith = (overviewFor: ShipOverviewQueries['overviewFor']): ShipOverviewQueries => ({
  overviewFor,
  overviewsMatching: vi.fn()
})

test('returns a ship overview', async () => {
  const overview = { name: 'King Roy', shipId: 'ship-1', status: 'at-sea' as const }

  await expect(
    controllerFor(queriesWith(vi.fn().mockResolvedValue(overview))).get({ id: 'ship-1' })
  ).resolves.toEqual({ status: 200, body: overview, dateTime: expect.any(Date) })
})

test('validates the ship id before querying', async () => {
  const queries = queriesWith(vi.fn())

  await expect(controllerFor(queries).get({ id: '' })).resolves.toMatchObject({
    error: new IsRequired('Id').message,
    status: 400
  })
  expect(queries.overviewFor).not.toHaveBeenCalled()
})

test('returns not found when no overview has caught up', async () => {
  await expect(
    controllerFor(queriesWith(vi.fn().mockResolvedValue(undefined))).get({ id: 'missing' })
  ).resolves.toMatchObject({ error: "Ship 'missing' does not exist", status: 404 })
})

test('hides overview query failures', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const failure = new ShipOverviewProjectionUnavailable(new Error('database detail'))

  const response = await controllerFor(queriesWith(vi.fn().mockRejectedValue(failure))).get({
    id: 'ship-1'
  })

  expect(response).toMatchObject({ error: opaqueApplicationErrorMessage, status: 500 })
  expect(response.error).not.toContain('database detail')
})

test('hides unexpected request parsing failures', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  await expect(controllerFor(queriesWith(vi.fn())).get(null as never)).resolves.toMatchObject({
    error: opaqueApplicationErrorMessage,
    status: 500
  })
})
