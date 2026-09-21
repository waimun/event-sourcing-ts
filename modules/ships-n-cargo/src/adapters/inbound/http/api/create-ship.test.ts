import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { createShipHandler } from './create-ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}
const controllers = createControllers(new InMemoryEventJournal(new Name('test-journal')))
const createShip = createShipHandler(controllers.createShip, () => 'generated-id')

beforeEach(() => {
  res.status = vi.fn<Send>().mockReturnValue(res as Response)
  res.json = vi.fn<Send>().mockReturnValue(res as Response)
})

test('id provided to create ship aggregate', async () => {
  req.body = { id: 'abc', name: 'King Roy' }

  await createShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith({
    status: 201,
    dateTime: expect.any(Date)
  })
})

test('missing id to create ship aggregate', async () => {
  req.body = { name: 'King Roy' }

  await createShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith({
    status: 201,
    dateTime: expect.any(Date),
    body: { id: 'generated-id' }
  })
})
