import express, { type Application, type ErrorRequestHandler } from 'express'
import { ping } from './ping'
import type { ShipHandlers } from './routes/ships'
import { createV1Router } from './routes/v1'

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

export const createHttpApplication = (handlers: ShipHandlers): Application => {
  const application = express()

  application.use(express.json())
  application.use(malformedJsonErrorHandler)
  application.use((req, _res, next) => {
    req.body ??= {}
    next()
  })
  application.get('/', ping)
  application.use('/api/v1', createV1Router(handlers))

  return application
}
