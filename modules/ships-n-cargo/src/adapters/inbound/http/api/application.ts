import express, { type Application, type ErrorRequestHandler } from 'express'
import type { EventJournal } from '../../../../application/ports/event-journal'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { createControllers } from '../controllers'
import { dockShipHandler } from './dock-ship'
import { loadContainerHandler } from './load-container'
import { ping } from './ping'
import { registerShipHandler } from './register-ship'
import { createV1Router } from './routes/v1'
import { sailShipHandler } from './sail-ship'
import { unloadContainerHandler } from './unload-container'

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
      registerShip: registerShipHandler(controllers.registerShip, generateId),
      dockShip: dockShipHandler(controllers.dockShip),
      loadContainer: loadContainerHandler(controllers.loadContainer),
      sailShip: sailShipHandler(controllers.sailShip),
      unloadContainer: unloadContainerHandler(controllers.unloadContainer)
    })
  )

  return application
}
