import { SailShipController } from './controller'
import { SailShipUseCase } from './use-case'
import { eventDataStore } from '../../index'

export const controller = new SailShipController(
  new SailShipUseCase(eventDataStore)
)
