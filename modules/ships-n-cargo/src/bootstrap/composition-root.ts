import type { Application } from 'express'
import { Pool } from 'pg'
import { createApplication } from '../adapters/inbound/http/api/application'
import { generateId } from '../adapters/inbound/http/generate-id'
import { InMemoryEventJournal } from '../adapters/outbound/persistence/in-memory-event-journal'
import { PostgreSqlEventJournal } from '../adapters/outbound/persistence/postgresql/event-journal'
import { verifyEventJournalSchema } from '../adapters/outbound/persistence/postgresql/event-journal-schema'
import { Name } from '../shared/domain/name'
import { PostgreSqlConnectionStringInvalid } from './errors'

interface RuntimeEnvironment {
  SHIPS_N_CARGO_DATABASE_URL?: string
}

export interface ApplicationRuntime {
  application: Application
  close: () => Promise<void>
}

const memoryRuntime = (): ApplicationRuntime => ({
  application: createApplication({
    eventJournal: new InMemoryEventJournal(new Name('ships-n-cargo')),
    generateId
  }),
  close: async () => undefined
})

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

  return {
    application: createApplication({
      eventJournal: new PostgreSqlEventJournal(pool),
      generateId
    }),
    close: () => pool.end()
  }
}
