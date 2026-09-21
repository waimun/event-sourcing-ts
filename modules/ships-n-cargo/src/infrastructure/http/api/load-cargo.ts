import type { Request, Response } from 'express'
import { trim } from '../../../shared/utils/text'
import { loadCargoController } from '../controllers'

export const loadCargo = async (req: Request, res: Response): Promise<void> => {
  const response = await loadCargoController.loadCargo({
    id: trim(req.body.id),
    cargoName: trim(req.body.cargoName),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
