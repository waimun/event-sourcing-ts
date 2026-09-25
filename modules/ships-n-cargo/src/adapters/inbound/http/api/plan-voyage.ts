import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { PlanVoyageController } from '../controllers/plan-voyage'

export const planVoyageHandler =
  (controller: PlanVoyageController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.plan({
      id: trim(req.body.id),
      destination: req.body.destination
    })

    res.status(response.status).json(response)
  }
