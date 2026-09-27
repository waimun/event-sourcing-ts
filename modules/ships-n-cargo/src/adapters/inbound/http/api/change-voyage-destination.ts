import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { ChangeVoyageDestinationController } from '../controllers/change-voyage-destination'

export const changeVoyageDestinationHandler =
  (controller: ChangeVoyageDestinationController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.change({
      id: trim(req.body.id),
      destination: req.body.destination,
      reason: req.body.reason
    })

    res.status(response.status).json(response)
  }
