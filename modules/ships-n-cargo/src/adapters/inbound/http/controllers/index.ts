import type { EventJournal } from '../../../../application/ports/event-journal'
import { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import { LoadContainerUseCase } from '../../../../application/use-cases/load-container/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { UnloadContainerUseCase } from '../../../../application/use-cases/unload-container/use-case'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { DockShipController } from './dock-ship'
import { LoadContainerController } from './load-container'
import { RegisterShipController } from './register-ship'
import { SailShipController } from './sail-ship'
import { UnloadContainerController } from './unload-container'

export const createControllers = (eventJournal: EventJournal<string, DomainEvent>) => ({
  registerShip: new RegisterShipController(new RegisterShipUseCase(eventJournal)),
  dockShip: new DockShipController(new DockShipUseCase(eventJournal)),
  loadContainer: new LoadContainerController(new LoadContainerUseCase(eventJournal)),
  sailShip: new SailShipController(new SailShipUseCase(eventJournal)),
  unloadContainer: new UnloadContainerController(new UnloadContainerUseCase(eventJournal))
})
