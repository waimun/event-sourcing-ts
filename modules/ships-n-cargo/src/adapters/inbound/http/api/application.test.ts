import { once } from 'node:events'
import { request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createApplication } from './application'

type HttpResponse = {
  body: unknown
  status: number | undefined
}

let port: number
let server: Server

beforeAll(async () => {
  server = createApplication({
    eventJournal: new InMemoryEventJournal(new Name('http-workflow-test')),
    generateId: () => 'generated-ship-id'
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

const send = (method: 'GET' | 'POST', path: string, body?: object): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body)
    const req = request(
      {
        agent: false,
        headers:
          payload === undefined
            ? undefined
            : {
                'Content-Length': Buffer.byteLength(payload),
                'Content-Type': 'application/json'
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
          resolve({
            body: JSON.parse(responseBody),
            status: response.statusCode
          })
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

test.each(['/create', '/dock', '/sail', '/load-cargo', '/unload-cargo'])(
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

test('injected dependencies support a deterministic create and dock workflow', async () => {
  const created = await send('POST', '/api/v1/ships/create', { name: 'King Roy' })

  expect(created).toEqual({
    body: {
      body: { id: 'generated-ship-id' },
      dateTime: expect.any(String),
      status: 201
    },
    status: 201
  })

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
})
