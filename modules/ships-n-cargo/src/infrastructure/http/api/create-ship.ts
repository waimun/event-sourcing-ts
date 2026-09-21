import type { Request, Response } from 'express'
import { trim } from '../../../shared/utils/text'
import type { CreateShipController } from '../controllers/create-ship'

export const createShipHandler =
  (controller: CreateShipController, generateId: () => string) =>
  async (req: Request, res: Response): Promise<void> => {
    let id = trim(req.body.id)
    const idNotSpecified = id.length === 0

    if (idNotSpecified) {
      id = generateId()
    }

    const response = await controller.create({ id, name: req.body.name })

    if (response.status === 201 && idNotSpecified) {
      response.body = { id }
    }

    res.status(response.status).json(response)
  }
