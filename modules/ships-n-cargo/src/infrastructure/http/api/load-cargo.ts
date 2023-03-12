import { Request, Response } from 'express'
import { controller } from '../../../application/use-cases/load-cargo'
import { trim } from '../../../shared/utils/text'

export const loadCargo = async (req: Request, res: Response): Promise<void> => {
  const response = await controller.loadCargo({
    id: trim(req.body.id),
    cargoName: trim(req.body.cargoName),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
