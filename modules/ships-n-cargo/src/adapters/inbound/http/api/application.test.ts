import { once } from 'node:events'
import { request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { EventJournalShipHistoryProjection } from '../../../outbound/projections/event-journal-ship-history'
import { createApplication } from './application'

type HttpResponse = {
  body: unknown
  status: number | undefined
}

let port: number
let server: Server

beforeAll(async () => {
  const eventJournal = new InMemoryEventJournal(new Name('http-workflow-test'))
  server = createApplication({
    eventJournal,
    generateId: () => 'generated-ship-id',
    shipHistoryProjection: new EventJournalShipHistoryProjection(eventJournal)
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  port = (server.address() as AddressInfo).port
})

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error === undefined) resolve()
        else reject(error)
      })
    })
)

const send = (
  method: 'GET' | 'POST',
  path: string,
  body?: object | string,
  contentType = 'application/json',
  parseJsonResponse = true
): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const payload =
      body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    const req = request(
      {
        agent: false,
        headers:
          payload === undefined
            ? undefined
            : {
                'Content-Length': Buffer.byteLength(payload),
                'Content-Type': contentType
              },
        host: '127.0.0.1',
        method,
        path,
        port
      },
      (response) => {
        response.setEncoding('utf8')
        let responseBody = ''

        response.on('data', (chunk: string) => {
          responseBody += chunk
        })
        response.on('end', () => {
          try {
            resolve({
              body: parseJsonResponse ? JSON.parse(responseBody) : responseBody,
              status: response.statusCode
            })
          } catch (error) {
            reject(error)
          }
        })
      }
    )

    req.on('error', reject)
    req.end(payload)
  })

test.each(['/', '/api/v1/'])('GET %s responds to ping', async (path) => {
  const response = await send('GET', path)

  expect(response).toEqual({
    body: {
      dateTime: expect.any(String),
      status: 200
    },
    status: 200
  })
})

test.each(['/register', '/dock', '/sail', '/load-container', '/unload-container'])(
  'POST /api/v1/ships%s reaches the ship handler',
  async (path) => {
    const response = await send('POST', `/api/v1/ships${path}`, {})

    expect(response).toEqual({
      body: {
        dateTime: expect.any(String),
        error: expect.any(String),
        status: 400
      },
      status: 400
    })
  }
)

test.each(['/register', '/dock', '/sail', '/load-container', '/unload-container'])(
  'POST /api/v1/ships%s without a body returns a JSON validation error',
  async (path) => {
    const response = await send('POST', `/api/v1/ships${path}`)

    expect(response).toEqual({
      body: {
        dateTime: expect.any(String),
        error: expect.any(String),
        status: 400
      },
      status: 400
    })
  }
)

test('POST with an unsupported body type returns a JSON validation error', async () => {
  const response = await send('POST', '/api/v1/ships/register', 'hello', 'text/plain')

  expect(response).toEqual({
    body: {
      dateTime: expect.any(String),
      error: expect.any(String),
      status: 400
    },
    status: 400
  })
})

test('malformed JSON request bodies receive a JSON validation error', async () => {
  const response = await send('POST', '/api/v1/ships/register', '{"name":')

  expect(response).toEqual({
    body: {
      dateTime: expect.any(String),
      error: 'Malformed JSON request body',
      status: 400
    },
    status: 400
  })
})

test('oversized JSON request bodies retain the parser error response', async () => {
  const response = await send(
    'POST',
    '/api/v1/ships/register',
    { name: 'x'.repeat(1024 * 100) },
    'application/json',
    false
  )

  expect(response.status).toBe(413)
  expect(response.body).toEqual(expect.stringContaining('PayloadTooLargeError'))
})

test('injected dependencies support a deterministic register, sail, and dock workflow', async () => {
  const registered = await send('POST', '/api/v1/ships/register', {
    name: 'King Roy',
    port: { country: 'us', name: 'Kingston' }
  })

  expect(registered).toEqual({
    body: {
      body: { id: 'generated-ship-id' },
      dateTime: expect.any(String),
      status: 201
    },
    status: 201
  })

  const sailed = await send('POST', '/api/v1/ships/sail', { id: 'generated-ship-id' })
  expect(sailed.status).toBe(200)

  const docked = await send('POST', '/api/v1/ships/dock', {
    id: 'generated-ship-id',
    port: { country: 'us', name: 'Henderson' }
  })

  expect(docked).toEqual({
    body: {
      dateTime: expect.any(String),
      status: 200
    },
    status: 200
  })

  const history = await send('GET', '/api/v1/ships/generated-ship-id/history')
  expect(history).toEqual({
    body: {
      body: {
        shipId: 'generated-ship-id',
        history: [
          {
            kind: 'ship-registered',
            name: 'King Roy',
            occurredAt: expect.any(String),
            port: { country: 'US', name: 'Kingston' }
          },
          { kind: 'ship-departed', occurredAt: expect.any(String) },
          {
            kind: 'ship-arrived',
            occurredAt: expect.any(String),
            port: { country: 'US', name: 'Henderson' }
          }
        ]
      },
      dateTime: expect.any(String),
      status: 200
    },
    status: 200
  })
})

test('history for an unknown ship returns not found without exposing journal details', async () => {
  const response = await send('GET', '/api/v1/ships/missing/history')

  expect(response).toEqual({
    body: {
      dateTime: expect.any(String),
      error: "Ship 'missing' does not exist",
      status: 404
    },
    status: 404
  })
})
