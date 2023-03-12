import { beforeEach, expect, jest, test } from '@jest/globals'
import { Request, Response, Send } from 'express'
import { dockShip } from './dock-ship'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../shared/domain/id'
import { NameNotAllowed } from '../../../shared/domain/name'
import { InvalidCountry } from '../../../domain/errors/dock-ship'
import { InvalidDate } from '../../../shared/domain/date'
import { createShip } from './create-ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}

beforeEach(() => {
  res.status = jest.fn<Send>().mockReturnValue(res as Response)
  res.json = jest.fn<Send>().mockReturnValue(res as Response)
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
  req.body = { id: 'abc', port: { name: 'Henderson', country: 'us' }, dateTime: 'invalid-date-format' }

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
