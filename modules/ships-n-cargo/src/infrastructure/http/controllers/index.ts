import { CreateShipUseCase } from '../../../application/use-cases/create-ship/use-case'
import { DockShipUseCase } from '../../../application/use-cases/dock-ship/use-case'
import { LoadCargoUseCase } from '../../../application/use-cases/load-cargo/use-case'
import { SailShipUseCase } from '../../../application/use-cases/sail-ship/use-case'
import { UnloadCargoUseCase } from '../../../application/use-cases/unload-cargo/use-case'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { EventJournal } from '../../../domain/events/event-journal'
import { Name } from '../../../shared/domain/name'
import { InMemoryEventJournal } from '../../persistence/in-memory-event-journal'
import { CreateShipController } from './create-ship'
import { DockShipController } from './dock-ship'
import { LoadCargoController } from './load-cargo'
import { SailShipController } from './sail-ship'
import { UnloadCargoController } from './unload-cargo'

const eventDataStore: EventJournal<string, DomainEvent> = new InMemoryEventJournal(
  new Name('ships-n-cargo')
)

export const createShipController = new CreateShipController(new CreateShipUseCase(eventDataStore))
export const dockShipController = new DockShipController(new DockShipUseCase(eventDataStore))
export const loadCargoController = new LoadCargoController(new LoadCargoUseCase(eventDataStore))
export const sailShipController = new SailShipController(new SailShipUseCase(eventDataStore))
export const unloadCargoController = new UnloadCargoController(
  new UnloadCargoUseCase(eventDataStore)
)
