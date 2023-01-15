import { LoadCargoController } from './controller'
import { LoadCargoUseCase } from './use-case'
import { eventDataStore } from '../../index'

export const controller = new LoadCargoController(
  new LoadCargoUseCase(eventDataStore)
)
