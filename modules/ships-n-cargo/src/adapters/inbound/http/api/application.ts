import express, { type Application, type ErrorRequestHandler } from 'express'
import type { EventJournal } from '../../../../application/ports/event-journal'
import type { ShipHistoryProjection } from '../../../../application/ports/ship-history-projection'
import { GetShipHistoryUseCase } from '../../../../application/use-cases/get-ship-history/use-case'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { createControllers } from '../controllers'
import { GetShipHistoryController } from '../controllers/get-ship-history'
import { dockShipHandler } from './dock-ship'
import { getShipHistoryHandler } from './get-ship-history'
import { loadContainerHandler } from './load-container'
import { ping } from './ping'
import { planVoyageHandler } from './plan-voyage'
import { registerShipHandler } from './register-ship'
import { createV1Router } from './routes/v1'
import { sailShipHandler } from './sail-ship'
import { unloadContainerHandler } from './unload-container'

export type ApplicationDependencies = {
  eventJournal: EventJournal<string, DomainEvent>
  generateId: () => string
  shipHistoryProjection: ShipHistoryProjection
}

const malformedJsonErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next
) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json({
      status: 400,
      error: 'Malformed JSON request body',
      dateTime: new Date()
    })
    return
  }

  next(error)
}

export const createApplication = ({
  eventJournal,
  generateId,
  shipHistoryProjection
}: ApplicationDependencies): Application => {
  const controllers = createControllers(eventJournal)
  const getShipHistory = new GetShipHistoryController(
    new GetShipHistoryUseCase(shipHistoryProjection)
  )
  const application = express()

  application.use(express.json())
  application.use(malformedJsonErrorHandler)
  application.use((req, _res, next) => {
    req.body ??= {}
    next()
  })
  application.get('/', ping)
  application.use(
    '/api/v1',
    createV1Router({
      getShipHistory: getShipHistoryHandler(getShipHistory),
      registerShip: registerShipHandler(controllers.registerShip, generateId),
      dockShip: dockShipHandler(controllers.dockShip),
      loadContainer: loadContainerHandler(controllers.loadContainer),
      planVoyage: planVoyageHandler(controllers.planVoyage),
      sailShip: sailShipHandler(controllers.sailShip),
      unloadContainer: unloadContainerHandler(controllers.unloadContainer)
    })
  )

  return application
}
