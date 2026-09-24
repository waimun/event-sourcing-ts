import type { Application } from 'express'
import { Pool } from 'pg'
import { createApplication } from '../adapters/inbound/http/api/application'
import { generateId } from '../adapters/inbound/http/generate-id'
import { InMemoryEventJournal } from '../adapters/outbound/persistence/in-memory-event-journal'
import { PostgreSqlEventJournal } from '../adapters/outbound/persistence/postgresql/event-journal'
import { verifyEventJournalSchema } from '../adapters/outbound/persistence/postgresql/event-journal-schema'
import { EventJournalShipHistoryProjection } from '../adapters/outbound/projections/event-journal-ship-history'
import type { EventJournal } from '../application/ports/event-journal'
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
