import type { Request, Response } from 'express'
import { trim } from '../../../shared/utils/text'
import type { UnloadCargoController } from '../controllers/unload-cargo'

export const unloadCargoHandler =
  (controller: UnloadCargoController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.unloadCargo({
      id: trim(req.body.id),
      cargoName: trim(req.body.cargoName),
      dateTime: req.body.dateTime
    })

    res.status(response.status).json(response)
  }
