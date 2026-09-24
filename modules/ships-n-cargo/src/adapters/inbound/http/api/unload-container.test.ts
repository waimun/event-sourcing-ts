import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { ContainerNotFound } from '../../../../domain/errors/ship'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { loadContainerHandler } from './load-container'
import { registerShipHandler } from './register-ship'
import { unloadContainerHandler } from './unload-container'

const req: Partial<Request> = {}
const res: Partial<Response> = {}
const controllers = createControllers(new InMemoryEventJournal(new Name('test-journal')))
const registerShip = registerShipHandler(controllers.registerShip, () => 'generated-id')
const loadContainer = loadContainerHandler(controllers.loadContainer)
const unloadContainer = unloadContainerHandler(controllers.unloadContainer)

beforeEach(() => {
  res.status = vi.fn<Send>().mockReturnValue(res as Response)
  res.json = vi.fn<Send>().mockReturnValue(res as Response)
})

test('id is required', async () => {
  req.body = {}

  await unloadContainer(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('empty id', async () => {
  req.body = { id: '' }

  await unloadContainer(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('id is invalid', async () => {
  req.body = { id: 'a!b' }

  await unloadContainer(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IdNotAllowed(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('container id is required', async () => {
  req.body = { id: 'abc' }

  await unloadContainer(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Container ID').message,
    dateTime: expect.any(Date)
  })
})

test('invalid container id', async () => {
  req.body = { id: 'abc', containerId: 'a#*x' }

  await unloadContainer(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IdNotAllowed(req.body.containerId, 'Container ID').message,
    dateTime: expect.any(Date)
  })
})

test('caller-supplied event time is not part of the command', async () => {
  req.body = { id: 'abc', containerId: 'container-1', dateTime: 'invalid-date-format' }

  await unloadContainer(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(404)
  expect(res.json).toHaveBeenCalledWith({
    status: 404,
    error: new ShipNotFound(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('id not found', async () => {
  req.body = { id: 'abc', containerId: 'container-1' }

  await unloadContainer(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(404)
  expect(res.json).toHaveBeenCalledWith({
    status: 404,
    error: new ShipNotFound(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cannot find container to unload', async () => {
  req.body = { id: 'abc', name: 'King Roy', port: { name: 'Kingston', country: 'US' } }
  await registerShip(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(201)

  req.body = { id: 'abc', containerId: 'container-1' }

  await unloadContainer(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(404)
  expect(res.json).toHaveBeenCalledWith({
    status: 404,
    error: new ContainerNotFound(req.body.containerId).message,
    dateTime: expect.any(Date)
  })
})

test('valid request', async () => {
  req.body = { id: 'xyz', name: 'King Roy', port: { name: 'Kingston', country: 'US' } }
  await registerShip(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(1, 201)

  req.body = {
    id: 'xyz',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Microservices Architecture'
  }
  await loadContainer(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(2, 200)
  expect(res.json).toHaveBeenNthCalledWith(2, {
    status: 200,
    dateTime: expect.any(Date)
  })

  await unloadContainer(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(3, 200)
  expect(res.json).toHaveBeenNthCalledWith(3, {
    status: 200,
    dateTime: expect.any(Date)
  })
})
