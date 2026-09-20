import express, { type RequestHandler } from 'express'
import { createShip } from '../create-ship'
import { dockShip } from '../dock-ship'
import { loadCargo } from '../load-cargo'
import { sailShip } from '../sail-ship'
import { unloadCargo } from '../unload-cargo'

const shipRouter = express.Router()

shipRouter.post('/create', createShip as RequestHandler)
shipRouter.post('/dock', dockShip as RequestHandler)
shipRouter.post('/sail', sailShip as RequestHandler)
shipRouter.post('/load-cargo', loadCargo as RequestHandler)
shipRouter.post('/unload-cargo', unloadCargo as RequestHandler)

export { shipRouter }
