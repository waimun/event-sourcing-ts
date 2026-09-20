import { eventDataStore } from '../../index'
import { DockShipController } from './controller'
import { DockShipUseCase } from './use-case'

export const controller = new DockShipController(new DockShipUseCase(eventDataStore))
