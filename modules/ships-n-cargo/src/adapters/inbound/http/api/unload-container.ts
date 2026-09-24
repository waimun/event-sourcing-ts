import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { UnloadContainerController } from '../controllers/unload-container'

export const unloadContainerHandler =
  (controller: UnloadContainerController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.unloadContainer({
      id: trim(req.body.id),
      containerId: trim(req.body.containerId)
    })

    res.status(response.status).json(response)
  }
