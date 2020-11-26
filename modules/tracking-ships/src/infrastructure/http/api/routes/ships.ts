import express from 'express'
import { CreateShipController } from '../../../../application/use-cases/create-ship/controller'
import { CreateShipUseCase } from '../../../../application/use-cases/create-ship/use-case'
import { InMemoryEventJournal } from '../../../persistence/in-memory-event-journal'
import { eventPayloadHandler } from '../../../../domain/events'

const shipRouter = express.Router()

const controller = new CreateShipController(
  new CreateShipUseCase(new InMemoryEventJournal('tracking-ships', eventPayloadHandler))
)

shipRouter.post('/', (req, res) => {
  const httpResponse = controller.create({ id: req.body.id, name: req.body.name })
  res.status(httpResponse.status).json(httpResponse)
})

export { shipRouter }
