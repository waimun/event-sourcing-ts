import express from 'express'
import { createShip } from '../create-ship'
import { dockShip } from '../dock-ship'

const shipRouter = express.Router()

shipRouter.post('/create', createShip)
shipRouter.post('/dock', dockShip)

export { shipRouter }
