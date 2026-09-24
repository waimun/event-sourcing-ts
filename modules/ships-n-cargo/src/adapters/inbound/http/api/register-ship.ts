import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { RegisterShipController } from '../controllers/register-ship'

export const registerShipHandler =
  (controller: RegisterShipController, generateId: () => string) =>
  async (req: Request, res: Response): Promise<void> => {
    let id = trim(req.body.id)
    const idNotSpecified = id.length === 0

    if (idNotSpecified) {
      id = generateId()
    }

    const response = await controller.register({ id, name: req.body.name, port: req.body.port })

    if (response.status === 201 && idNotSpecified) {
      response.body = { id }
    }

    res.status(response.status).json(response)
  }
