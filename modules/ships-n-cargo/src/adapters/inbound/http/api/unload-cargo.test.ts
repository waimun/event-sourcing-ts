import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { CargoNotFound } from '../../../../domain/errors/ship'
import { InvalidDate } from '../../../../shared/domain/date'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { loadCargoHandler } from './load-cargo'
import { registerShipHandler } from './register-ship'
import { unloadCargoHandler } from './unload-cargo'

const req: Partial<Request> = {}
const res: Partial<Response> = {}
const controllers = createControllers(new InMemoryEventJournal(new Name('test-journal')))
const registerShip = registerShipHandler(controllers.registerShip, () => 'generated-id')
const loadCargo = loadCargoHandler(controllers.loadCargo)
const unloadCargo = unloadCargoHandler(controllers.unloadCargo)

beforeEach(() => {
  res.status = vi.fn<Send>().mockReturnValue(res as Response)
  res.json = vi.fn<Send>().mockReturnValue(res as Response)
})

test('id is required', async () => {
  req.body = {}

  await unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('empty id', async () => {
  req.body = { id: '' }

  await unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('id is invalid', async () => {
  req.body = { id: 'a!b' }

  await unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IdNotAllowed(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cargo name is required', async () => {
  req.body = { id: 'abc' }

  await unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Cargo name').message,
    dateTime: expect.any(Date)
  })
})

test('invalid cargo name', async () => {
  req.body = { id: 'abc', cargoName: 'a#*x' }

  await unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new NameNotAllowed(req.body.cargoName, 'Cargo name').message,
    dateTime: expect.any(Date)
  })
})

test('dateTime is invalid', async () => {
  req.body = { id: 'abc', cargoName: 'Microservices Architecture', dateTime: 'invalid-date-format' }

  await unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new InvalidDate().message,
    dateTime: expect.any(Date)
  })
})

test('id not found', async () => {
  req.body = { id: 'abc', cargoName: 'Microservices Architecture' }

  await unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(404)
  expect(res.json).toHaveBeenCalledWith({
    status: 404,
    error: new ShipNotFound(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cannot find cargo to unload', async () => {
  req.body = { id: 'abc', name: 'King Roy', port: { name: 'Kingston', country: 'US' } }
  await registerShip(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(201)

  req.body = { id: 'abc', cargoName: 'Microservices Architecture' }

  await unloadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(404)
  expect(res.json).toHaveBeenCalledWith({
    status: 404,
    error: new CargoNotFound(req.body.cargoName).message,
    dateTime: expect.any(Date)
  })
})

test('valid request', async () => {
  req.body = { id: 'xyz', name: 'King Roy', port: { name: 'Kingston', country: 'US' } }
  await registerShip(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(1, 201)

  req.body = { id: 'xyz', cargoName: 'Microservices Architecture' }
  await loadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(2, 200)
  expect(res.json).toHaveBeenNthCalledWith(2, {
    status: 200,
    dateTime: expect.any(Date)
  })

  await unloadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(3, 200)
  expect(res.json).toHaveBeenNthCalledWith(3, {
    status: 200,
    dateTime: expect.any(Date)
  })
})
