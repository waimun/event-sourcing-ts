import type { Request, Response } from 'express'
import { trim } from '../../../shared/utils/text'
import { dockShipController } from '../controllers'

export const dockShip = async (req: Request, res: Response): Promise<void> => {
  const response = await dockShipController.dock({
    id: trim(req.body.id),
    port: req.body.port,
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
