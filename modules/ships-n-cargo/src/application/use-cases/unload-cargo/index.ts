import { eventDataStore } from '../../index'
import { UnloadCargoController } from './controller'
import { UnloadCargoUseCase } from './use-case'

export const controller = new UnloadCargoController(new UnloadCargoUseCase(eventDataStore))
