import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import type { GetShipOverviewController } from '../controllers/get-ship-overview'
import { getShipOverviewHandler } from './get-ship-overview'

const controller = {
  get: vi.fn().mockResolvedValue({ status: 200, body: {}, dateTime: new Date() })
} as unknown as GetShipOverviewController
const handler = getShipOverviewHandler(controller)
const response: Partial<Response> = {}

beforeEach(() => {
  response.status = vi.fn<Send>().mockReturnValue(response as Response)
  response.json = vi.fn<Send>().mockReturnValue(response as Response)
})

test('gets the overview for the trimmed route id', async () => {
  await handler(
    { params: { shipId: ' ship-1 ' } } as Request<{ shipId: string }>,
    response as Response
  )

  expect(controller.get).toHaveBeenCalledWith({ id: 'ship-1' })
  expect(response.status).toHaveBeenCalledWith(200)
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 200 }))
})
