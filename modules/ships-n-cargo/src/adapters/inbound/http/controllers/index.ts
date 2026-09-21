import type { EventJournal } from '../../../../application/ports/event-journal'
import { CreateShipUseCase } from '../../../../application/use-cases/create-ship/use-case'
import { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import { LoadCargoUseCase } from '../../../../application/use-cases/load-cargo/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { UnloadCargoUseCase } from '../../../../application/use-cases/unload-cargo/use-case'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { CreateShipController } from './create-ship'
import { DockShipController } from './dock-ship'
import { LoadCargoController } from './load-cargo'
import { SailShipController } from './sail-ship'
import { UnloadCargoController } from './unload-cargo'

export const createControllers = (eventJournal: EventJournal<string, DomainEvent>) => ({
  createShip: new CreateShipController(new CreateShipUseCase(eventJournal)),
  dockShip: new DockShipController(new DockShipUseCase(eventJournal)),
  loadCargo: new LoadCargoController(new LoadCargoUseCase(eventJournal)),
  sailShip: new SailShipController(new SailShipUseCase(eventJournal)),
  unloadCargo: new UnloadCargoController(new UnloadCargoUseCase(eventJournal))
})
