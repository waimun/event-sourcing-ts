import express from 'express'
import { createShip } from '../create-ship'
import { dockShip } from '../dock-ship'
import { sailShip } from '../sail-ship'
import { loadCargo } from '../load-cargo'

const shipRouter = express.Router()

shipRouter.post('/create', createShip)
shipRouter.post('/dock', dockShip)
shipRouter.post('/sail', sailShip)
shipRouter.post('/load-cargo', loadCargo)

export { shipRouter }
