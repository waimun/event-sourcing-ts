import type { Application } from 'express'
import { Pool } from 'pg'
import { createHttpApplication } from '../adapters/inbound/http/api/application'
import { cancelVoyageHandler } from '../adapters/inbound/http/api/cancel-voyage'
import { changeVoyageDestinationHandler } from '../adapters/inbound/http/api/change-voyage-destination'
import { divertShipHandler } from '../adapters/inbound/http/api/divert-ship'
import { dockShipHandler } from '../adapters/inbound/http/api/dock-ship'
import { getShipHistoryHandler } from '../adapters/inbound/http/api/get-ship-history'
import { getShipOverviewHandler } from '../adapters/inbound/http/api/get-ship-overview'
import { listShipOverviewsHandler } from '../adapters/inbound/http/api/list-ship-overviews'
import { loadContainerHandler } from '../adapters/inbound/http/api/load-container'
import { planVoyageHandler } from '../adapters/inbound/http/api/plan-voyage'
import { registerShipHandler } from '../adapters/inbound/http/api/register-ship'
import { sailShipHandler } from '../adapters/inbound/http/api/sail-ship'
import { unloadContainerHandler } from '../adapters/inbound/http/api/unload-container'
import { createControllers } from '../adapters/inbound/http/controllers'
import { GetShipHistoryController } from '../adapters/inbound/http/controllers/get-ship-history'
import { GetShipOverviewController } from '../adapters/inbound/http/controllers/get-ship-overview'
import { ListShipOverviewsController } from '../adapters/inbound/http/controllers/list-ship-overviews'
import { generateId } from '../adapters/inbound/http/generate-id'
import { InMemoryEventJournal } from '../adapters/outbound/persistence/in-memory-event-journal'
import { PostgreSqlEventJournal } from '../adapters/outbound/persistence/postgresql/event-journal'
import { migrateEventJournalSchema } from '../adapters/outbound/persistence/postgresql/event-journal-migrations'
import { SqliteEventJournal } from '../adapters/outbound/persistence/sqlite/event-journal'
import { EventJournalShipHistoryProjection } from '../adapters/outbound/projections/event-journal-ship-history'
import { InMemoryShipOverviewProjection } from '../adapters/outbound/projections/in-memory-ship-overview'
import { PostgreSqlShipOverviewProjection } from '../adapters/outbound/projections/postgresql-ship-overview'
import { SqliteShipOverviewProjection } from '../adapters/outbound/projections/sqlite-ship-overview'
import type { EventJournal } from '../application/ports/event-journal'
import type { ShipHistoryProjection } from '../application/ports/ship-history-projection'
import type {
  ShipOverviewProjection,
  ShipOverviewQueries
} from '../application/ports/ship-overview-projection'
import { GetShipHistoryUseCase } from '../application/use-cases/get-ship-history/use-case'
import { GetShipOverviewUseCase } from '../application/use-cases/get-ship-overview/use-case'
import { ListShipOverviewsUseCase } from '../application/use-cases/list-ship-overviews/use-case'
import type { DomainEvent } from '../domain/events/domain-event'
import { Name } from '../shared/domain/name'
import { EventJournalConfigurationInvalid } from './errors/event-journal-configuration-invalid'
import { PostgreSqlConnectionStringInvalid } from './errors/postgresql-connection-string-invalid'
import {
  type ReportProjectionFailure,
  ShipOverviewProjectionLifecycle
} from './ship-overview-projection-lifecycle'

interface RuntimeEnvironment {
  SHIPS_N_CARGO_POSTGRESQL_URL?: string
  SHIPS_N_CARGO_SQLITE_PATH?: string
}

type EventJournalSelection = 'memory' | 'postgresql' | 'sqlite'

interface ClosableEventJournal extends EventJournal<string, DomainEvent> {
  close: () => void
}

type SqliteEventJournalFactory = (databasePath: string) => ClosableEventJournal

interface ShipOverviewReadModel extends ShipOverviewProjection, ShipOverviewQueries {}

interface ClosableShipOverviewProjection extends ShipOverviewReadModel {
  close: () => void
}

interface ProjectionLifecycle {
  start: (reportFailure: ReportProjectionFailure) => void
  stop: () => Promise<void>
}

interface ProjectionRuntimeFactories {
  projectionLifecycle?: (projection: ShipOverviewProjection) => ProjectionLifecycle
  sqliteShipOverviewProjection?: (databasePath: string) => ClosableShipOverviewProjection
}

export interface ApplicationRuntime {
  application: Application
  close: () => Promise<void>
  start: (reportProjectionFailure: ReportProjectionFailure) => void
}

export type ApplicationDependencies = {
  eventJournal: EventJournal<string, DomainEvent>
  generateId: () => string
  shipHistoryProjection: ShipHistoryProjection
  shipOverviewQueries: ShipOverviewQueries
}

export const createApplication = ({
  eventJournal,
  generateId,
  shipHistoryProjection,
  shipOverviewQueries
}: ApplicationDependencies): Application => {
  const controllers = createControllers(eventJournal)
  const getShipHistory = new GetShipHistoryController(
    new GetShipHistoryUseCase(shipHistoryProjection)
  )
  const getShipOverview = new GetShipOverviewController(
    new GetShipOverviewUseCase(shipOverviewQueries)
  )
  const listShipOverviews = new ListShipOverviewsController(
    new ListShipOverviewsUseCase(shipOverviewQueries)
  )

  return createHttpApplication({
    getShipHistory: getShipHistoryHandler(getShipHistory),
    getShipOverview: getShipOverviewHandler(getShipOverview),
    listShipOverviews: listShipOverviewsHandler(listShipOverviews),
    registerShip: registerShipHandler(controllers.registerShip, generateId),
    cancelVoyage: cancelVoyageHandler(controllers.cancelVoyage),
    changeVoyageDestination: changeVoyageDestinationHandler(controllers.changeVoyageDestination),
    divertShip: divertShipHandler(controllers.divertShip),
    dockShip: dockShipHandler(controllers.dockShip),
    loadContainer: loadContainerHandler(controllers.loadContainer),
    planVoyage: planVoyageHandler(controllers.planVoyage),
    sailShip: sailShipHandler(controllers.sailShip),
    unloadContainer: unloadContainerHandler(controllers.unloadContainer)
  })
}

const applicationFor = (
  eventJournal: EventJournal<string, DomainEvent>,
  shipOverviewQueries: ShipOverviewQueries
): Application =>
  createApplication({
    eventJournal,
    generateId,
    shipHistoryProjection: new EventJournalShipHistoryProjection(eventJournal),
    shipOverviewQueries
  })

const runtimeFor = (
  eventJournal: EventJournal<string, DomainEvent>,
  projection: ShipOverviewReadModel,
  projectionLifecycle: (projection: ShipOverviewProjection) => ProjectionLifecycle,
  closeResources: () => void | Promise<void> = () => undefined,
  closeProjection: () => void = () => undefined
): ApplicationRuntime => {
  const lifecycle = projectionLifecycle(projection)
  let closing: Promise<void> | undefined

  return {
    application: applicationFor(eventJournal, projection),
    close: () => {
      closing ??= (async () => {
        try {
          await lifecycle.stop()
        } finally {
          try {
            closeProjection()
          } finally {
            await closeResources()
          }
        }
      })()
      return closing
    },
    start: (reportProjectionFailure) => lifecycle.start(reportProjectionFailure)
  }
}

const memoryRuntime = (
  projectionLifecycle: (projection: ShipOverviewProjection) => ProjectionLifecycle
): ApplicationRuntime => {
  const eventJournal = new InMemoryEventJournal(new Name('ships-n-cargo'))
  return runtimeFor(
    eventJournal,
    new InMemoryShipOverviewProjection(eventJournal),
    projectionLifecycle
  )
}

const selectedEventJournal = (environment: RuntimeEnvironment): EventJournalSelection => {
  const postgresqlConfigured = environment.SHIPS_N_CARGO_POSTGRESQL_URL !== undefined
  const sqliteConfigured = environment.SHIPS_N_CARGO_SQLITE_PATH !== undefined

  if (postgresqlConfigured && sqliteConfigured) {
    throw new EventJournalConfigurationInvalid(
      'SHIPS_N_CARGO_POSTGRESQL_URL and SHIPS_N_CARGO_SQLITE_PATH cannot both be set'
    )
  }
  if (postgresqlConfigured) return 'postgresql'
  if (sqliteConfigured) return 'sqlite'
  return 'memory'
}

export const createDefaultApplication = async (
  environment: RuntimeEnvironment = process.env,
  PoolConstructor: typeof Pool = Pool,
  sqliteEventJournalFactory: SqliteEventJournalFactory = (databasePath) =>
    new SqliteEventJournal(databasePath),
  projectionRuntimeFactories: ProjectionRuntimeFactories = {}
): Promise<ApplicationRuntime> => {
  const projectionLifecycle =
    projectionRuntimeFactories.projectionLifecycle ??
    ((projection: ShipOverviewProjection) => new ShipOverviewProjectionLifecycle(projection))
  const sqliteShipOverviewProjection =
    projectionRuntimeFactories.sqliteShipOverviewProjection ??
    ((databasePath: string) => new SqliteShipOverviewProjection(databasePath))
  const selection = selectedEventJournal(environment)
  if (selection === 'memory') return memoryRuntime(projectionLifecycle)

  if (selection === 'sqlite') {
    const databasePath = environment.SHIPS_N_CARGO_SQLITE_PATH
    if (databasePath === undefined || databasePath.trim() === '') {
      throw new EventJournalConfigurationInvalid(
        'SHIPS_N_CARGO_SQLITE_PATH must contain a database file path when SQLite is selected'
      )
    }
    const eventJournal = sqliteEventJournalFactory(databasePath.trim())
    let projection: ClosableShipOverviewProjection
    try {
      projection = sqliteShipOverviewProjection(databasePath.trim())
    } catch (error) {
      eventJournal.close()
      throw error
    }
    return runtimeFor(
      eventJournal,
      projection,
      projectionLifecycle,
      () => eventJournal.close(),
      () => projection.close()
    )
  }

  const connectionString = environment.SHIPS_N_CARGO_POSTGRESQL_URL
  if (connectionString === undefined || connectionString.trim() === '')
    throw new PostgreSqlConnectionStringInvalid()

  const pool = new PoolConstructor({ connectionString })
  try {
    await migrateEventJournalSchema(pool)
  } catch (error) {
    try {
      await pool.end()
    } catch {
      // Preserve the compatibility failure that prevented startup.
    }
    throw error
  }

  const eventJournal = new PostgreSqlEventJournal(pool)
  return runtimeFor(
    eventJournal,
    new PostgreSqlShipOverviewProjection(pool),
    projectionLifecycle,
    () => pool.end()
  )
}
