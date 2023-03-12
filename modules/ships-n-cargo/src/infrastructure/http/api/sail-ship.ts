import { Request, Response } from 'express'
import { controller } from '../../../application/use-cases/sail-ship'
import { trim } from '../../../shared/utils/text'

export const sailShip = async (req: Request, res: Response): Promise<void> => {
  const response = await controller.sail({
    id: trim(req.body.id),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
