import { UnloadCargoController } from './controller'
import { UnloadCargoUseCase } from './use-case'
import { eventDataStore } from '../../index'

export const controller = new UnloadCargoController(
  new UnloadCargoUseCase(eventDataStore)
)
