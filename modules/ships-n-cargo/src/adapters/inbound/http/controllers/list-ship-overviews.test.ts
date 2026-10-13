import { expect, test, vi } from 'vitest'
import type { ShipOverviewQueries } from '../../../../application/ports/ship-overview-projection'
import { ListShipOverviewsUseCase } from '../../../../application/use-cases/list-ship-overviews/use-case'
import { ShipOverviewProjectionUnavailable } from '../../../outbound/projections/errors/ship-overview'
import { opaqueApplicationErrorMessage } from './error-response'
import { ListShipOverviewsController } from './list-ship-overviews'

const controllerFor = (overviewsMatching: ShipOverviewQueries['overviewsMatching']) =>
  new ListShipOverviewsController(
    new ListShipOverviewsUseCase({ overviewFor: vi.fn(), overviewsMatching })
  )

const request = (
  overrides: Partial<{ portCountry: string; portName: string; status: string }> = {}
) => ({ portCountry: '', portName: '', status: '', ...overrides })

test('lists ships by status', async () => {
  const matching = vi.fn().mockResolvedValue([])

  await expect(controllerFor(matching).get(request({ status: ' at-sea ' }))).resolves.toEqual({
    body: { ships: [] },
    dateTime: expect.any(Date),
    status: 200
  })
  expect(matching).toHaveBeenCalledWith({ status: 'at-sea' })
})

test('lists ships by normalized current port', async () => {
  const matching = vi.fn().mockResolvedValue([])

  await controllerFor(matching).get(request({ portCountry: ' ca ', portName: ' Belmont ' }))

  expect(matching).toHaveBeenCalledWith({ currentPort: { country: 'CA', name: 'Belmont' } })
})

test.each([
  [request(), 'Status or port is required'],
  [request({ portCountry: 'US', portName: 'Miami', status: 'at-port' }), 'not both'],
  [request({ status: 'docked' }), "status must be 'at-port' or 'at-sea'"],
  [request({ portCountry: 'US' }), 'Port name is required'],
  [request({ portName: 'Miami' }), 'Country is required']
])('rejects an invalid list filter', async (input, message) => {
  const matching = vi.fn()
  const response = await controllerFor(matching).get(input)

  expect(response).toMatchObject({ error: expect.stringContaining(message), status: 400 })
  expect(matching).not.toHaveBeenCalled()
})

test('hides overview query failures', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const failure = new ShipOverviewProjectionUnavailable(new Error('database detail'))

  const response = await controllerFor(vi.fn().mockRejectedValue(failure)).get(
    request({ status: 'at-port' })
  )

  expect(response).toMatchObject({ error: opaqueApplicationErrorMessage, status: 500 })
})

test('hides unexpected filter parsing failures', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  await expect(controllerFor(vi.fn()).get(null as never)).resolves.toMatchObject({
    error: opaqueApplicationErrorMessage,
    status: 500
  })
})
