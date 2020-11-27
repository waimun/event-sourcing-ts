import express from 'express'
import { CreateShipController } from '../../../../application/use-cases/create-ship/controller'
import { CreateShipUseCase } from '../../../../application/use-cases/create-ship/use-case'
import { InMemoryEventJournal } from '../../../persistence/in-memory-event-journal'
import { eventPayloadHandler } from '../../../../domain/events'
import { UniqueIdentifier } from '../../../guid/unique-identifier'

const shipRouter = express.Router()

const controller = new CreateShipController(
  new CreateShipUseCase(new InMemoryEventJournal('tracking-ships', eventPayloadHandler))
)

shipRouter.post('/', (req, res) => {
  let id = String(req.body.id).trim()
  if (id === 'null' || id === 'undefined' || id.length === 0) id = new UniqueIdentifier().toString()

  const httpResponse = controller.create({ id, name: req.body.name })
  res.status(httpResponse.status).json(httpResponse)
})

export { shipRouter }
