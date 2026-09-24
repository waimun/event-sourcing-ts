import type { EventJournal } from '../../../../application/ports/event-journal'
import { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import { LoadCargoUseCase } from '../../../../application/use-cases/load-cargo/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { UnloadCargoUseCase } from '../../../../application/use-cases/unload-cargo/use-case'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { DockShipController } from './dock-ship'
import { LoadCargoController } from './load-cargo'
import { RegisterShipController } from './register-ship'
import { SailShipController } from './sail-ship'
import { UnloadCargoController } from './unload-cargo'

export const createControllers = (eventJournal: EventJournal<string, DomainEvent>) => ({
  registerShip: new RegisterShipController(new RegisterShipUseCase(eventJournal)),
  dockShip: new DockShipController(new DockShipUseCase(eventJournal)),
  loadCargo: new LoadCargoController(new LoadCargoUseCase(eventJournal)),
  sailShip: new SailShipController(new SailShipUseCase(eventJournal)),
  unloadCargo: new UnloadCargoController(new UnloadCargoUseCase(eventJournal))
})
