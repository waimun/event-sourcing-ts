import { Request, Response } from 'express'
import { controller } from '../../../application/use-cases/sail-ship'
import { trim } from '../../../shared/utils/text'

export const sailShip = (req: Request, res: Response): void => {
  const response = controller.sail({
    id: trim(req.body.id),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
