import express from 'express'
import { ping } from '../ping'
import { registerShipRouter, type ShipHandlers } from './ships'

export const createV1Router = (handlers: ShipHandlers) => {
  const router = express.Router()

  router.get('/', ping)
  router.use('/ships', registerShipRouter(handlers))

  return router
}
