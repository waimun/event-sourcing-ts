import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { CancelVoyageController } from '../controllers/cancel-voyage'

export const cancelVoyageHandler =
  (controller: CancelVoyageController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.cancel({
      id: trim(req.body.id),
      reason: req.body.reason
    })

    res.status(response.status).json(response)
  }
