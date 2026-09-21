import type { Request, Response } from 'express'
import { trim } from '../../../shared/utils/text'
import { sailShipController } from '../controllers'

export const sailShip = async (req: Request, res: Response): Promise<void> => {
  const response = await sailShipController.sail({
    id: trim(req.body.id),
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
