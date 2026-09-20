import { eventDataStore } from '../../index'
import { LoadCargoController } from './controller'
import { LoadCargoUseCase } from './use-case'

export const controller = new LoadCargoController(new LoadCargoUseCase(eventDataStore))
