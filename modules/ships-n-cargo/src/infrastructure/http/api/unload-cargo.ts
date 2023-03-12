import { Request, Response } from 'express'
import { controller } from '../../../application/use-cases/unload-cargo'
import { trim } from '../../../shared/utils/text'

export const unloadCargo = async (req: Request, res: Response): Promise<void> => {
  const response = await controller.unloadCargo({
    id: trim(req.body.id),
    cargoName: trim(req.body.cargoName),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
