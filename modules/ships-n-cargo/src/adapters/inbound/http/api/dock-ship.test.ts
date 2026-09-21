import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import { InvalidCountry } from '../../../../domain/errors/dock-ship'
import { InvalidDate } from '../../../../shared/domain/date'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { createShipHandler } from './create-ship'
import { dockShipHandler } from './dock-ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}
const controllers = createControllers(new InMemoryEventJournal(new Name('test-journal')))
const createShip = createShipHandler(controllers.createShip, () => 'generated-id')
const dockShip = dockShipHandler(controllers.dockShip)

beforeEach(() => {
  res.status = vi.fn<Send>().mockReturnValue(res as Response)
  res.json = vi.fn<Send>().mockReturnValue(res as Response)
})

test('id is required', async () => {
  req.body = {}

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('id is invalid', async () => {
  req.body = { id: 'a!b' }

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IdNotAllowed(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('port is required', async () => {
  req.body = { id: 'abc' }

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Port').message,
    dateTime: expect.any(Date)
  })
})

test('port name is required', async () => {
  req.body = { id: 'abc', port: {} }

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Port name').message,
    dateTime: expect.any(Date)
  })
})

test('port name is invalid', async () => {
  req.body = { id: 'abc', port: { name: 'a!b' } }

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new NameNotAllowed(req.body.port.name, 'Port name').message,
    dateTime: expect.any(Date)
  })
})

test('port country is required', async () => {
  req.body = { id: 'abc', port: { name: 'Henderson' } }

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Country').message,
    dateTime: expect.any(Date)
  })
})

test('port country is invalid', async () => {
  req.body = { id: 'abc', port: { name: 'Henderson', country: 'ZZ' } }

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new InvalidCountry(req.body.port.country).message,
    dateTime: expect.any(Date)
  })
})

test('dateTime is invalid', async () => {
  req.body = {
    id: 'abc',
    port: { name: 'Henderson', country: 'us' },
    dateTime: 'invalid-date-format'
  }

  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new InvalidDate().message,
    dateTime: expect.any(Date)
  })
})

test('valid request', async () => {
  req.body = { id: 'abc', name: 'King Roy' }
  await createShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(201)

  req.body = { id: 'abc', port: { name: 'Henderson', country: 'us' } }
  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.json).toHaveBeenCalledWith({
    status: 200,
    dateTime: expect.any(Date)
  })
})
