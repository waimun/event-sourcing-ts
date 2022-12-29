import { Request, Response } from 'express'
import { trim } from '../../../shared/utils/text'
import { UniqueIdentifier } from '../../guid/unique-identifier'
import { controller } from '../../../application/use-cases/create-ship'

export const createShip = (req: Request, res: Response): void => {
  let id = trim(req.body.id)
  const idNotSpecified = id.length === 0

  if (idNotSpecified) {
    id = new UniqueIdentifier().toString()
  }

  const response = controller.create({ id, name: req.body.name })

  if (response.status === 201 && idNotSpecified) {
    response.body = { id }
  }

  res.status(response.status).json(response)
}
