import { DatabaseSync } from 'node:sqlite'
import { afterEach, expect, test } from 'vitest'
import { migrateEventJournalSchema } from './event-journal-migrations'

const databases: DatabaseSync[] = []

afterEach(() => {
  databases.forEach((database) => {
    database.close()
  })
  databases.length = 0
})

test('migration produces the expected columns and constraints', () => {
  const database = new DatabaseSync(':memory:')
  databases.push(database)
  migrateEventJournalSchema(database)

  expect(database.prepare('PRAGMA table_info(event_journal)').all()).toEqual([
    {
      cid: 0,
      name: 'aggregate_id',
      type: 'TEXT',
      notnull: 1,
      dflt_value: null,
      pk: 1
    },
    { cid: 1, name: 'version', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 2 },
    {
      cid: 2,
      name: 'event_payload',
      type: 'TEXT',
      notnull: 1,
      dflt_value: null,
      pk: 0
    }
  ])

  const insert = database.prepare(
    'INSERT INTO event_journal (aggregate_id, version, event_payload) VALUES (?, ?, ?)'
  )
  insert.run('ship-1', 1, '{}')
  expect(() => insert.run('ship-1', 1, '{}')).toThrow()
  expect(() => insert.run('ship-2', 0, '{}')).toThrow()
})
