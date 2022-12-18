import { Request, Response } from 'express'
import { Response as R } from '../../../application/use-cases/response'

export const ping = (req: Request, res: Response): void => {
  const pong: R = {
    status: 200,
    dateTime: new Date()
  }

  res.json(pong)
}
