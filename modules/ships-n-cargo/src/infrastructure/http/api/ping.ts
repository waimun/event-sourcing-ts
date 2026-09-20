import type { Request, Response } from 'express'
import type { Response as R } from '../../../application/use-cases/response'

export const ping = (_req: Request, res: Response): void => {
  const pong: R = {
    status: 200,
    dateTime: new Date()
  }

  res.json(pong)
}
