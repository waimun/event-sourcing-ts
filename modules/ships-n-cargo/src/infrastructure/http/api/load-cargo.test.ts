import { beforeEach, expect, jest, test } from '@jest/globals'
import { Request, Response, Send } from 'express'
import { loadCargo } from './load-cargo'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../shared/domain/id'
import { NameNotAllowed } from '../../../shared/domain/name'
import { InvalidDate } from '../../../shared/domain/date'
import { ShipNotFound } from '../../../application/use-cases/load-cargo/error'
import { createShip } from './create-ship'
import { CargoAlreadyLoaded } from '../../../domain/errors/ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}

beforeEach(() => {
  res.status = jest.fn<Send>().mockReturnValue(res as Response)
  res.json = jest.fn<Send>().mockReturnValue(res as Response)
})

test('id is required', async () => {
  req.body = {}

  await loadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('empty id', async () => {
  req.body = { id: '' }

  await loadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('id is invalid', async () => {
  req.body = { id: 'a!b' }

  await loadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IdNotAllowed(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cargo name is required', async () => {
  req.body = { id: 'abc' }

  await loadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Cargo name').message,
    dateTime: expect.any(Date)
  })
})

test('invalid cargo name', async () => {
  req.body = { id: 'abc', cargoName: 'a#*x' }

  await loadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new NameNotAllowed(req.body.cargoName, 'Cargo name').message,
    dateTime: expect.any(Date)
  })
})

test('dateTime is invalid', async () => {
  req.body = { id: 'abc', cargoName: 'Microservices Architecture', dateTime: 'invalid-date-format' }

  await loadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new InvalidDate().message,
    dateTime: expect.any(Date)
  })
})

test('id not found', async () => {
  req.body = { id: 'abc', cargoName: 'Microservices Architecture' }

  await loadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new ShipNotFound(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cannot load same cargo twice', async () => {
  req.body = { id: 'abc', name: 'Thomas Jefferson' }
  await createShip(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(1, 201)

  req.body = { id: 'abc', cargoName: 'Microservices Architecture' }
  await loadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(2, 200)

  // cannot load same cargo twice
  await loadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(3, 400)
  expect(res.json).toHaveBeenNthCalledWith(3, {
    status: 400,
    error: new CargoAlreadyLoaded(req.body.cargoName).message,
    dateTime: expect.any(Date)
  })
})

test('valid request', async () => {
  req.body = { id: 'xyz', name: 'King Roy' }
  await createShip(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(201)

  req.body = { id: 'xyz', cargoName: 'Microservices Architecture' }
  await loadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.json).toHaveBeenCalledWith({
    status: 200,
    dateTime: expect.any(Date)
  })
})
