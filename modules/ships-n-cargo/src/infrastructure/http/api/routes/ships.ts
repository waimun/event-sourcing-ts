import express from 'express'
import { CreateShipController } from '../../../../application/use-cases/create-ship/controller'
import { CreateShipUseCase } from '../../../../application/use-cases/create-ship/use-case'
import { InMemoryEventJournal } from '../../../persistence/in-memory-event-journal'
import { UniqueIdentifier } from '../../../guid/unique-identifier'
import { trim } from '../../../../shared/utils/text'

const shipRouter = express.Router()

const controller = new CreateShipController(
  new CreateShipUseCase(new InMemoryEventJournal('ships-n-cargo'))
)

shipRouter.post('/', (req, res) => {
  let id = trim(req.body.id)
  const idNotSpecified = id.length === 0

  if (idNotSpecified) {
    id = new UniqueIdentifier().toString()
  }

  const httpResponse = controller.create({ id, name: req.body.name })

  if (httpResponse.status === 201 && idNotSpecified) {
    httpResponse.body = { id }
  }

  res.status(httpResponse.status).json(httpResponse)
})

export { shipRouter }
