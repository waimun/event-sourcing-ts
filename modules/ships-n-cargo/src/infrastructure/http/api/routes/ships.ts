import express, { type RequestHandler } from 'express'

export type ShipHandlers = {
  createShip: RequestHandler
  dockShip: RequestHandler
  loadCargo: RequestHandler
  sailShip: RequestHandler
  unloadCargo: RequestHandler
}

export const createShipRouter = (handlers: ShipHandlers) => {
  const router = express.Router()

  router.post('/create', handlers.createShip)
  router.post('/dock', handlers.dockShip)
  router.post('/sail', handlers.sailShip)
  router.post('/load-cargo', handlers.loadCargo)
  router.post('/unload-cargo', handlers.unloadCargo)

  return router
}
