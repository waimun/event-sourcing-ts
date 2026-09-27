import express, { type RequestHandler } from 'express'

export type ShipHandlers = {
  getShipHistory: RequestHandler<{ shipId: string }>
  registerShip: RequestHandler
  cancelVoyage: RequestHandler
  changeVoyageDestination: RequestHandler
  divertShip: RequestHandler
  dockShip: RequestHandler
  loadContainer: RequestHandler
  planVoyage: RequestHandler
  sailShip: RequestHandler
  unloadContainer: RequestHandler
}

export const registerShipRouter = (handlers: ShipHandlers) => {
  const router = express.Router()

  router.get('/:shipId/history', handlers.getShipHistory)
  router.post('/register', handlers.registerShip)
  router.post('/cancel-voyage', handlers.cancelVoyage)
  router.post('/change-voyage-destination', handlers.changeVoyageDestination)
  router.post('/divert', handlers.divertShip)
  router.post('/dock', handlers.dockShip)
  router.post('/sail', handlers.sailShip)
  router.post('/load-container', handlers.loadContainer)
  router.post('/plan-voyage', handlers.planVoyage)
  router.post('/unload-container', handlers.unloadContainer)

  return router
}
