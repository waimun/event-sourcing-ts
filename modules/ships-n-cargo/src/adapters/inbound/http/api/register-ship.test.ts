import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { registerShipHandler } from './register-ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}
const controllers = createControllers(new InMemoryEventJournal(new Name('test-journal')))
const registerShip = registerShipHandler(controllers.registerShip, () => 'generated-id')
const port = { name: 'Kingston', country: 'US' }

beforeEach(() => {
  res.status = vi.fn<Send>().mockReturnValue(res as Response)
  res.json = vi.fn<Send>().mockReturnValue(res as Response)
})

test('id provided to register ship aggregate', async () => {
  req.body = { id: 'abc', name: 'King Roy', port }

  await registerShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith({
    status: 201,
    dateTime: expect.any(Date)
  })
})

test('missing id to register ship aggregate', async () => {
  req.body = { name: 'King Roy', port }

  await registerShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(201)
  expect(res.json).toHaveBeenCalledWith({
    status: 201,
    dateTime: expect.any(Date),
    body: { id: 'generated-id' }
  })
})
