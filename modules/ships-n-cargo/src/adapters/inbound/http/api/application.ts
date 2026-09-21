import express, { type Application, type ErrorRequestHandler } from 'express'
import type { EventJournal } from '../../../../application/ports/event-journal'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { createControllers } from '../controllers'
import { createShipHandler } from './create-ship'
import { dockShipHandler } from './dock-ship'
import { loadCargoHandler } from './load-cargo'
import { ping } from './ping'
import { createV1Router } from './routes/v1'
import { sailShipHandler } from './sail-ship'
import { unloadCargoHandler } from './unload-cargo'

export type ApplicationDependencies = {
  eventJournal: EventJournal<string, DomainEvent>
  generateId: () => string
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
  generateId
}: ApplicationDependencies): Application => {
  const controllers = createControllers(eventJournal)
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
      createShip: createShipHandler(controllers.createShip, generateId),
      dockShip: dockShipHandler(controllers.dockShip),
      loadCargo: loadCargoHandler(controllers.loadCargo),
      sailShip: sailShipHandler(controllers.sailShip),
      unloadCargo: unloadCargoHandler(controllers.unloadCargo)
    })
  )

  return application
}
