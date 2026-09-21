import express from 'express'
import { ping } from '../ping'
import { createShipRouter, type ShipHandlers } from './ships'

export const createV1Router = (handlers: ShipHandlers) => {
  const router = express.Router()

  router.get('/', ping)
  router.use('/ships', createShipRouter(handlers))

  return router
}
