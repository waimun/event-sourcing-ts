import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { DivertShipController } from '../controllers/divert-ship'

export const divertShipHandler =
  (controller: DivertShipController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.divert({
      id: trim(req.body.id),
      destination: req.body.destination
    })

    res.status(response.status).json(response)
  }
