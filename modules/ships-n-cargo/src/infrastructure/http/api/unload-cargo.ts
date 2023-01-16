import { Request, Response } from 'express'
import { controller } from '../../../application/use-cases/unload-cargo'
import { trim } from '../../../shared/utils/text'

export const unloadCargo = (req: Request, res: Response): void => {
  const response = controller.unloadCargo({
    id: trim(req.body.id),
    cargoName: trim(req.body.cargoName),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
