import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { SailShipController } from '../controllers/sail-ship'

export const sailShipHandler =
  (controller: SailShipController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.sail({
      id: trim(req.body.id),
      dateTime: req.body.dateTime
    })

    res.status(response.status).json(response)
  }
