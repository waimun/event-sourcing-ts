import { eventDataStore } from '../../index'
import { CreateShipController } from './controller'
import { CreateShipUseCase } from './use-case'

export const controller = new CreateShipController(new CreateShipUseCase(eventDataStore))
