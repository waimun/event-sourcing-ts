import { DatabaseSync } from 'node:sqlite'
import { afterEach, expect, test } from 'vitest'
import { migrateEventJournalSchema } from './event-journal-migrations'

const databases: DatabaseSync[] = []
const database = (): DatabaseSync => {
  const value = new DatabaseSync(':memory:')
  databases.push(value)
  return value
}

afterEach(() => {
  databases.forEach((value) => {
    if (value.isOpen) value.close()
  })
  databases.length = 0
})

test('applies the numbered migration once and records its version', () => {
  const value = database()

  migrateEventJournalSchema(value)
  migrateEventJournalSchema(value)

  expect(value.prepare('SELECT version FROM event_journal_migrations').all()).toEqual([
    { version: 1 }
  ])
  expect(
    value.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name").all()
  ).toEqual([{ name: 'event_journal' }, { name: 'event_journal_migrations' }])
})

test('rolls back the ledger when the migration cannot be applied', () => {
  const value = database()
  value.exec('CREATE TABLE event_journal (aggregate_id TEXT PRIMARY KEY) STRICT')

  expect(() => migrateEventJournalSchema(value)).toThrow()

  expect(
    value
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ?")
      .get('event_journal_migrations')
  ).toBeUndefined()
})
