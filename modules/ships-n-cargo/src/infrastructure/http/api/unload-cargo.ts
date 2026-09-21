import type { Request, Response } from 'express'
import { trim } from '../../../shared/utils/text'
import { unloadCargoController } from '../controllers'

export const unloadCargo = async (req: Request, res: Response): Promise<void> => {
  const response = await unloadCargoController.unloadCargo({
    id: trim(req.body.id),
    cargoName: trim(req.body.cargoName),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
