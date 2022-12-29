import { CreateShipController } from './controller'
import { CreateShipUseCase } from './use-case'
import { eventDataStore } from '../../index'

export const controller = new CreateShipController(
  new CreateShipUseCase(eventDataStore)
)
