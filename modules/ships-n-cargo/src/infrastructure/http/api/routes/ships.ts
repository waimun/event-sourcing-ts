import express from 'express'
import { createShip } from '../create-ship'

const shipRouter = express.Router()

shipRouter.post('/', createShip)

export { shipRouter }
