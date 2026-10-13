import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import type { ListShipOverviewsController } from '../controllers/list-ship-overviews'
import { listShipOverviewsHandler } from './list-ship-overviews'

const controller = {
  get: vi.fn().mockResolvedValue({ status: 200, body: { ships: [] }, dateTime: new Date() })
} as unknown as ListShipOverviewsController
const handler = listShipOverviewsHandler(controller)
const response: Partial<Response> = {}

beforeEach(() => {
  response.status = vi.fn<Send>().mockReturnValue(response as Response)
  response.json = vi.fn<Send>().mockReturnValue(response as Response)
})

test('passes trimmed string query filters to the controller', async () => {
  await handler(
    {
      query: { portCountry: ' ca ', portName: ' Belmont ', status: ['at-port'] }
    } as unknown as Request,
    response as Response
  )

  expect(controller.get).toHaveBeenCalledWith({
    portCountry: 'ca',
    portName: 'Belmont',
    status: ''
  })
  expect(response.status).toHaveBeenCalledWith(200)
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 200 }))
})
