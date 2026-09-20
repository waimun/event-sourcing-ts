import { eventDataStore } from '../../index'
import { SailShipController } from './controller'
import { SailShipUseCase } from './use-case'

export const controller = new SailShipController(new SailShipUseCase(eventDataStore))
