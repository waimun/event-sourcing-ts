import { expect, jest, test } from '@jest/globals'
import { Request, Response, Send } from 'express'
import { ping } from './ping'

test('ping', () => {
  const req: Partial<Request> = {}
  const res: Partial<Response> = {}
  res.json = jest.fn<Send>().mockReturnValue(res as Response)

  ping(req as Request, res as Response)

  expect(res.json).toHaveBeenCalledWith({
    status: 200,
    dateTime: expect.any(Date)
  })
})
