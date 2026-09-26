import { once } from 'node:events'
import { request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import express, { type RequestHandler } from 'express'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { registerShipRouter, type ShipHandlers } from './ships'

let port: number
let server: Server

const identifyHandler =
  (handler: string): RequestHandler =>
  (request, response) => {
    response.json({ handler, shipId: request.params.shipId })
  }

beforeAll(async () => {
  const handlers: ShipHandlers = {
    getShipHistory: identifyHandler('getShipHistory'),
    registerShip: identifyHandler('registerShip'),
    divertShip: identifyHandler('divertShip'),
    dockShip: identifyHandler('dockShip'),
    loadContainer: identifyHandler('loadContainer'),
    planVoyage: identifyHandler('planVoyage'),
    sailShip: identifyHandler('sailShip'),
    unloadContainer: identifyHandler('unloadContainer')
  }
  const application = express().use('/api/v1/ships', registerShipRouter(handlers))

  server = application.listen(0, '127.0.0.1')
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

const send = (method: 'GET' | 'POST', path: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        agent: false,
        host: '127.0.0.1',
        method,
        path: `/api/v1/ships${path}`,
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
            resolve(JSON.parse(responseBody))
          } catch (error) {
            reject(error)
          }
        })
      }
    )

    req.on('error', reject)
    req.end()
  })

test.each([
  ['GET', '/ship-123/history', 'getShipHistory', 'ship-123'],
  ['POST', '/register', 'registerShip', undefined],
  ['POST', '/divert', 'divertShip', undefined],
  ['POST', '/dock', 'dockShip', undefined],
  ['POST', '/sail', 'sailShip', undefined],
  ['POST', '/load-container', 'loadContainer', undefined],
  ['POST', '/plan-voyage', 'planVoyage', undefined],
  ['POST', '/unload-container', 'unloadContainer', undefined]
] as const)('%s %s dispatches to %s', async (method, path, handler, shipId) => {
  const response = await send(method, path)

  expect(response).toEqual({ handler, ...(shipId === undefined ? {} : { shipId }) })
})
