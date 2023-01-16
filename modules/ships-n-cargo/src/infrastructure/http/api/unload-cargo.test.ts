import { beforeEach, expect, jest, test } from '@jest/globals'
import { Request, Response, Send } from 'express'
import { loadCargo } from './load-cargo'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../shared/domain/id'
import { NameNotAllowed } from '../../../shared/domain/name'
import { InvalidDate } from '../../../shared/domain/date'
import { ShipNotFound } from '../../../application/use-cases/unload-cargo/error'
import { createShip } from './create-ship'
import { unloadCargo } from './unload-cargo'
import { CargoNotFound } from '../../../domain/errors/ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}

beforeEach(() => {
  res.status = jest.fn<Send>().mockReturnValue(res as Response)
  res.json = jest.fn<Send>().mockReturnValue(res as Response)
})

test('id is required', () => {
  req.body = {}

  unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('empty id', () => {
  req.body = { id: '' }

  unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})

test('id is invalid', () => {
  req.body = { id: 'a!b' }

  unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IdNotAllowed(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cargo name is required', () => {
  req.body = { id: 'abc' }

  unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Cargo name').message,
    dateTime: expect.any(Date)
  })
})

test('invalid cargo name', () => {
  req.body = { id: 'abc', cargoName: 'a#*x' }

  unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new NameNotAllowed(req.body.cargoName, 'Cargo name').message,
    dateTime: expect.any(Date)
  })
})

test('dateTime is invalid', () => {
  req.body = { id: 'abc', cargoName: 'Microservices Architecture', dateTime: 'invalid-date-format' }

  unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new InvalidDate().message,
    dateTime: expect.any(Date)
  })
})

test('id not found', () => {
  req.body = { id: 'abc', cargoName: 'Microservices Architecture' }

  unloadCargo(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new ShipNotFound(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cannot find cargo to unload', () => {
  req.body = { id: 'abc', name: 'King Roy' }
  createShip(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(201)

  req.body = { id: 'abc', cargoName: 'Microservices Architecture' }

  unloadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new CargoNotFound(req.body.cargoName).message,
    dateTime: expect.any(Date)
  })
})

test('valid request', () => {
  req.body = { id: 'xyz', name: 'King Roy' }
  createShip(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(1, 201)

  req.body = { id: 'xyz', cargoName: 'Microservices Architecture' }
  loadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(2, 200)
  expect(res.json).toHaveBeenNthCalledWith(2, {
    status: 200,
    dateTime: expect.any(Date)
  })

  unloadCargo(req as Request, res as Response)
  expect(res.status).toHaveBeenNthCalledWith(3, 200)
  expect(res.json).toHaveBeenNthCalledWith(3, {
    status: 200,
    dateTime: expect.any(Date)
  })
})
