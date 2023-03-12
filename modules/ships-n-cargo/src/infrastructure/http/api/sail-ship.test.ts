import { beforeEach, expect, jest, test } from '@jest/globals'
import { Request, Response, Send } from 'express'
import { sailShip } from './sail-ship'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../shared/domain/id'
import { InvalidDate } from '../../../shared/domain/date'
import { createShip } from './create-ship'
import { dockShip } from './dock-ship'
import { ShipNotFound } from '../../../application/use-cases/sail-ship/error'
import { InvalidPortForDeparture } from '../../../domain/errors/ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}

beforeEach(() => {
  res.status = jest.fn<Send>().mockReturnValue(res as Response)
  res.json = jest.fn<Send>().mockReturnValue(res as Response)
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

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new ShipNotFound(req.body.id).message,
    dateTime: expect.any(Date)
  })
})

test('cannot depart from a missing port', async () => {
  req.body = { id: 'abc', name: 'Queen Mary' }
  await createShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(201)

  req.body = { id: 'abc' }
  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new InvalidPortForDeparture().message,
    dateTime: expect.any(Date)
  })
})

test('valid request', async () => {
  req.body = { id: 'xyz', name: 'King Roy' }
  await createShip(req as Request, res as Response)

  expect(res.status).toHaveBeenNthCalledWith(1, 201)

  req.body = { id: 'xyz', port: { name: 'Tennessee', country: 'us' } }
  await dockShip(req as Request, res as Response)

  expect(res.status).toHaveBeenNthCalledWith(2, 200)
  expect(res.json).toHaveBeenNthCalledWith(2, {
    status: 200,
    dateTime: expect.any(Date)
  })

  req.body = { id: 'xyz' }
  await sailShip(req as Request, res as Response)

  expect(res.status).toHaveBeenNthCalledWith(3, 200)
  expect(res.json).toHaveBeenNthCalledWith(3, {
    status: 200,
    dateTime: expect.any(Date)
  })
})
