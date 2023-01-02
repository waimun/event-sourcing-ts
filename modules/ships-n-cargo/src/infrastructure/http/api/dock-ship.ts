import { Request, Response } from 'express'
import { controller } from '../../../application/use-cases/dock-ship'
import { trim } from '../../../shared/utils/text'

export const dockShip = (req: Request, res: Response): void => {
  const response = controller.dock({
    id: trim(req.body.id),
    port: req.body.port,
    dateTime: req.body.dateTime
  })

  res.status(response.status).json(response)
}
