import type { Request, Response } from 'express'
import { trim } from '../../../../shared/utils/text'
import type { ListShipOverviewsController } from '../controllers/list-ship-overviews'

const queryText = (value: unknown): string => (typeof value === 'string' ? trim(value) : '')

export const listShipOverviewsHandler =
  (controller: ListShipOverviewsController) =>
  async (req: Request, res: Response): Promise<void> => {
    const response = await controller.get({
      portCountry: queryText(req.query.portCountry),
      portName: queryText(req.query.portName),
      status: queryText(req.query.status)
    })
    res.status(response.status).json(response)
  }
