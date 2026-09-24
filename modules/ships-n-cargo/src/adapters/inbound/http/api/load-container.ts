import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { LoadContainerController } from '../controllers/load-container'

export const loadContainerHandler =
  (controller: LoadContainerController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.loadContainer({
      id: trim(req.body.id),
      containerId: trim(req.body.containerId),
      description: trim(req.body.description),
      dateTime: req.body.dateTime
    })

    res.status(response.status).json(response)
  }
