import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import type { ShipHistoryProjection } from '../../../../application/ports/ship-history-projection'
import { GetShipHistoryQuery } from '../../../../application/queries/get-ship-history/query'
import { GetShipHistoryController } from '../controllers/get-ship-history'
import { getShipHistoryHandler } from './get-ship-history'

const projection: ShipHistoryProjection = {
  historyFor: vi.fn().mockResolvedValue({ shipId: 'ship-1', history: [] })
}
const handler = getShipHistoryHandler(
  new GetShipHistoryController(new GetShipHistoryQuery(projection))
)
const response: Partial<Response> = {}

beforeEach(() => {
  response.status = vi.fn<Send>().mockReturnValue(response as Response)
  response.json = vi.fn<Send>().mockReturnValue(response as Response)
})

test('gets history for the ship id in the route', async () => {
  await handler(
    { params: { shipId: ' ship-1 ' } } as Request<{ shipId: string }>,
    response as Response
  )

  expect(projection.historyFor).toHaveBeenCalledWith('ship-1')
  expect(response.status).toHaveBeenCalledWith(200)
  expect(response.json).toHaveBeenCalledWith({
    status: 200,
    body: { shipId: 'ship-1', history: [] },
    dateTime: expect.any(Date)
  })
})
