import { beforeEach, expect, jest, test } from '@jest/globals'
import { createShip } from './create-ship'
import { Request, Response, Send } from 'express'

const req: Partial<Request> = {}
const res: Partial<Response> = {}

beforeEach(() => {
  res.status = jest.fn<Send>().mockReturnValue(res as Response)
  res.json = jest.fn<Send>().mockReturnValue(res as Response)
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
    body: { id: expect.any(String) }
  })
})
