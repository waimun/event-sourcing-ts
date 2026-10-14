import type { EventJournal } from '../../../../application/ports/event-journal'
import type { ShipHistoryProjection } from '../../../../application/ports/ship-history-projection'
import type { ShipOverviewQueries } from '../../../../application/ports/ship-overview-projection'
import { CancelVoyageUseCase } from '../../../../application/use-cases/cancel-voyage/use-case'
import { ChangeVoyageDestinationUseCase } from '../../../../application/use-cases/change-voyage-destination/use-case'
import { DivertShipUseCase } from '../../../../application/use-cases/divert-ship/use-case'
import { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import { GetShipHistoryUseCase } from '../../../../application/use-cases/get-ship-history/use-case'
import { GetShipOverviewUseCase } from '../../../../application/use-cases/get-ship-overview/use-case'
import { ListShipOverviewsUseCase } from '../../../../application/use-cases/list-ship-overviews/use-case'
import { LoadContainerUseCase } from '../../../../application/use-cases/load-container/use-case'
import { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { UnloadContainerUseCase } from '../../../../application/use-cases/unload-container/use-case'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { CancelVoyageController } from './cancel-voyage'
import { ChangeVoyageDestinationController } from './change-voyage-destination'
import { DivertShipController } from './divert-ship'
import { DockShipController } from './dock-ship'
import { GetShipHistoryController } from './get-ship-history'
import { GetShipOverviewController } from './get-ship-overview'
import { ListShipOverviewsController } from './list-ship-overviews'
import { LoadContainerController } from './load-container'
import { PlanVoyageController } from './plan-voyage'
import { RegisterShipController } from './register-ship'
import { SailShipController } from './sail-ship'
import { UnloadContainerController } from './unload-container'

export const createCommandControllers = (eventJournal: EventJournal<string, DomainEvent>) => ({
  registerShip: new RegisterShipController(new RegisterShipUseCase(eventJournal)),
  cancelVoyage: new CancelVoyageController(new CancelVoyageUseCase(eventJournal)),
  changeVoyageDestination: new ChangeVoyageDestinationController(
    new ChangeVoyageDestinationUseCase(eventJournal)
  ),
  divertShip: new DivertShipController(new DivertShipUseCase(eventJournal)),
  dockShip: new DockShipController(new DockShipUseCase(eventJournal)),
  loadContainer: new LoadContainerController(new LoadContainerUseCase(eventJournal)),
  planVoyage: new PlanVoyageController(new PlanVoyageUseCase(eventJournal)),
  sailShip: new SailShipController(new SailShipUseCase(eventJournal)),
  unloadContainer: new UnloadContainerController(new UnloadContainerUseCase(eventJournal))
})

interface QueryControllerDependencies {
  shipHistoryProjection: ShipHistoryProjection
  shipOverviewQueries: ShipOverviewQueries
}

export const createQueryControllers = ({
  shipHistoryProjection,
  shipOverviewQueries
}: QueryControllerDependencies) => ({
  getShipHistory: new GetShipHistoryController(new GetShipHistoryUseCase(shipHistoryProjection)),
  getShipOverview: new GetShipOverviewController(new GetShipOverviewUseCase(shipOverviewQueries)),
  listShipOverviews: new ListShipOverviewsController(
    new ListShipOverviewsUseCase(shipOverviewQueries)
  )
})
