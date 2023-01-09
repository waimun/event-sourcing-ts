import express from 'express'
import { createShip } from '../create-ship'
import { dockShip } from '../dock-ship'
import { sailShip } from '../sail-ship'

const shipRouter = express.Router()

shipRouter.post('/create', createShip)
shipRouter.post('/dock', dockShip)
shipRouter.post('/sail', sailShip)

export { shipRouter }
