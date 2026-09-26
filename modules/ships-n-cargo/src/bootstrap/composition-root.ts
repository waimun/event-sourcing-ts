import type { Application } from 'express'
import { Pool } from 'pg'
import { createHttpApplication } from '../adapters/inbound/http/api/application'
import { divertShipHandler } from '../adapters/inbound/http/api/divert-ship'
import { dockShipHandler } from '../adapters/inbound/http/api/dock-ship'
import { getShipHistoryHandler } from '../adapters/inbound/http/api/get-ship-history'
import { loadContainerHandler } from '../adapters/inbound/http/api/load-container'
import { planVoyageHandler } from '../adapters/inbound/http/api/plan-voyage'
import { registerShipHandler } from '../adapters/inbound/http/api/register-ship'
import { sailShipHandler } from '../adapters/inbound/http/api/sail-ship'
import { unloadContainerHandler } from '../adapters/inbound/http/api/unload-container'
import { createControllers } from '../adapters/inbound/http/controllers'
import { GetShipHistoryController } from '../adapters/inbound/http/controllers/get-ship-history'
import { generateId } from '../adapters/inbound/http/generate-id'
import { InMemoryEventJournal } from '../adapters/outbound/persistence/in-memory-event-journal'
import { PostgreSqlEventJournal } from '../adapters/outbound/persistence/postgresql/event-journal'
import { verifyEventJournalSchema } from '../adapters/outbound/persistence/postgresql/event-journal-schema'
import { EventJournalShipHistoryProjection } from '../adapters/outbound/projections/event-journal-ship-history'
import type { EventJournal } from '../application/ports/event-journal'
import type { ShipHistoryProjection } from '../application/ports/ship-history-projection'
import { GetShipHistoryUseCase } from '../application/use-cases/get-ship-history/use-case'
import type { DomainEvent } from '../domain/events/domain-event'
import { Name } from '../shared/domain/name'
import { PostgreSqlConnectionStringInvalid } from './errors/postgresql-connection-string-invalid'

interface RuntimeEnvironment {
  SHIPS_N_CARGO_DATABASE_URL?: string
}

export interface ApplicationRuntime {
  application: Application
  close: () => Promise<void>
}

export type ApplicationDependencies = {
  eventJournal: EventJournal<string, DomainEvent>
  generateId: () => string
  shipHistoryProjection: ShipHistoryProjection
}

export const createApplication = ({
  eventJournal,
  generateId,
  shipHistoryProjection
}: ApplicationDependencies): Application => {
  const controllers = createControllers(eventJournal)
  const getShipHistory = new GetShipHistoryController(
    new GetShipHistoryUseCase(shipHistoryProjection)
  )

  return createHttpApplication({
    getShipHistory: getShipHistoryHandler(getShipHistory),
    registerShip: registerShipHandler(controllers.registerShip, generateId),
    divertShip: divertShipHandler(controllers.divertShip),
    dockShip: dockShipHandler(controllers.dockShip),
    loadContainer: loadContainerHandler(controllers.loadContainer),
    planVoyage: planVoyageHandler(controllers.planVoyage),
    sailShip: sailShipHandler(controllers.sailShip),
    unloadContainer: unloadContainerHandler(controllers.unloadContainer)
  })
}

const applicationFor = (eventJournal: EventJournal<string, DomainEvent>): Application =>
  createApplication({
    eventJournal,
    generateId,
    shipHistoryProjection: new EventJournalShipHistoryProjection(eventJournal)
  })

const memoryRuntime = (): ApplicationRuntime => {
  const eventJournal = new InMemoryEventJournal(new Name('ships-n-cargo'))
  return {
    application: applicationFor(eventJournal),
    close: async () => undefined
  }
}

export const createDefaultApplication = async (
  environment: RuntimeEnvironment = process.env,
  PoolConstructor: typeof Pool = Pool
): Promise<ApplicationRuntime> => {
  const connectionString = environment.SHIPS_N_CARGO_DATABASE_URL
  if (connectionString === undefined) return memoryRuntime()
  if (connectionString.trim() === '') throw new PostgreSqlConnectionStringInvalid()

  const pool = new PoolConstructor({ connectionString })
  try {
    await verifyEventJournalSchema(pool)
  } catch (error) {
    try {
      await pool.end()
    } catch {
      // Preserve the compatibility failure that prevented startup.
    }
    throw error
  }

  const eventJournal = new PostgreSqlEventJournal(pool)
  return {
    application: applicationFor(eventJournal),
    close: () => pool.end()
  }
}
