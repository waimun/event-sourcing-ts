import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { DockShipController } from '../controllers/dock-ship'

export const dockShipHandler =
  (controller: DockShipController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.dock({
      id: trim(req.body.id),
      port: req.body.port
    })

    res.status(response.status).json(response)
  }
