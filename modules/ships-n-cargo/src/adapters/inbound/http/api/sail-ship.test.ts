import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { ShipNotAtPort } from '../../../../domain/errors/ship'
import { InvalidDate } from '../../../../shared/domain/date'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { registerShipHandler } from './register-ship'
import { sailShipHandler } from './sail-ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}
const controllers = createControllers(new InMemoryEventJournal(new Name('test-journal')))
const registerShip = registerShipHandler(controllers.registerShip, () => 'generated-id')
const sailShip = sailShipHandler(controllers.sailShip)

beforeEach(() => {
  res.status = vi.fn<Send>().mockReturnValue(res as Response)
  res.json = vi.fn<Send>().mockReturnValue(res as Response)
})

test('id is required', async () => {
  req.body = {}

  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('id is invalid', async () => {
  req.body = { id: 'a!b' }

  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IdNotAllowed(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('dateTime is invalid', async () => {
  req.body = { id: 'abc', dateTime: 'invalid-date-format' }

  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new InvalidDate().message,
    dateTime: expect.any(Date)
  })
})

test('id not found', async () => {
  req.body = { id: 'abc' }
  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(404)
  expect(res.json).toHaveBeenCalledWith({
    status: 404,
    error: new ShipNotFound(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cannot depart twice without arriving', async () => {
  req.body = { id: 'abc', name: 'Queen Mary', port: { name: 'Kingston', country: 'US' } }
  await registerShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(201)

  req.body = { id: 'abc' }
  await sailShip(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(200)
  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(409)
  expect(res.json).toHaveBeenCalledWith({
    status: 409,
    error: new ShipNotAtPort().message,
    dateTime: expect.any(Date)
  })
})

test('valid request', async () => {
  req.body = { id: 'xyz', name: 'King Roy', port: { name: 'Kingston', country: 'US' } }
  await registerShip(req as Request, res as Response)

  expect(res.status).toHaveBeenNthCalledWith(1, 201)

  req.body = { id: 'xyz' }
  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenNthCalledWith(2, 200)
  expect(res.json).toHaveBeenNthCalledWith(2, {
    status: 200,
    dateTime: expect.any(Date)
  })
})
