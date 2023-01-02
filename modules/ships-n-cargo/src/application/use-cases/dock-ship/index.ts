import { DockShipController } from './controller'
import { DockShipUseCase } from './use-case'
import { eventDataStore } from '../../index'

export const controller = new DockShipController(
  new DockShipUseCase(eventDataStore)
)
