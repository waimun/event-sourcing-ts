import express, { type Application } from 'express'
import type { DomainEvent } from '../../../domain/events/domain-event'
import type { EventJournal } from '../../../domain/events/event-journal'
import { Name } from '../../../shared/domain/name'
import { Guid } from '../../guid/unique-identifier'
import { InMemoryEventJournal } from '../../persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { createShipHandler } from './create-ship'
import { dockShipHandler } from './dock-ship'
import { loadCargoHandler } from './load-cargo'
import { ping } from './ping'
import { createV1Router } from './routes/v1'
import { sailShipHandler } from './sail-ship'
import { unloadCargoHandler } from './unload-cargo'

export type ApplicationDependencies = {
  eventJournal: EventJournal<string, DomainEvent>
  generateId: () => string
}

const createApplication = (dependencies: Partial<ApplicationDependencies> = {}): Application => {
  const eventJournal =
    dependencies.eventJournal ?? new InMemoryEventJournal(new Name('ships-n-cargo'))
  /* v8 ignore next -- production randomness is replaced at this boundary in tests */
  const generateId = dependencies.generateId ?? (() => new Guid().toString())
  const controllers = createControllers(eventJournal)
  const application = express()

  application.use(express.json())
  application.get('/', ping)
  application.use(
    '/api/v1',
    createV1Router({
      createShip: createShipHandler(controllers.createShip, generateId),
      dockShip: dockShipHandler(controllers.dockShip),
      loadCargo: loadCargoHandler(controllers.loadCargo),
      sailShip: sailShipHandler(controllers.sailShip),
      unloadCargo: unloadCargoHandler(controllers.unloadCargo)
    })
  )

  return application
}

export { createApplication }
