import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { GetShipOverviewController } from '../controllers/get-ship-overview'

export const getShipOverviewHandler =
  (controller: GetShipOverviewController) =>
  async (req: Request<{ shipId: string }>, res: Response): Promise<void> => {
    const response = await controller.get({ id: trim(req.params.shipId) })
    res.status(response.status).json(response)
  }
