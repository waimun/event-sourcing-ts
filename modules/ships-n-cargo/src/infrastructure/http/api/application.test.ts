import { expect, test, vi } from 'vitest'
import { ping } from './ping'
import { v1Router } from './routes/v1'

const { application, get, json, jsonMiddleware, listen, mockPing, mockV1Router, use } = vi.hoisted(
  () => {
    const get = vi.fn()
    const listen = vi.fn()
    const use = vi.fn()

    return {
      application: { get, listen, use },
      get,
      json: vi.fn(),
      jsonMiddleware: vi.fn(),
      listen,
      mockPing: vi.fn(),
      mockV1Router: vi.fn(),
      use
    }
  }
)

vi.mock('express', () => ({
  default: Object.assign(
    vi.fn(() => application),
    {
      json: json.mockReturnValue(jsonMiddleware)
    }
  )
}))

vi.mock('./ping', () => ({ ping: mockPing }))
vi.mock('./routes/v1', () => ({ v1Router: mockV1Router }))

import { createApplication } from './application'

test('creates the wired application without listening', () => {
  expect(createApplication()).toBe(application)

  expect(json).toHaveBeenCalledOnce()
  expect(use).toHaveBeenNthCalledWith(1, jsonMiddleware)
  expect(get).toHaveBeenCalledWith('/', ping)
  expect(use).toHaveBeenNthCalledWith(2, '/api/v1', v1Router)
  expect(listen).not.toHaveBeenCalled()
})
