import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { JournalVersionConflict } from '../../../../application/errors/journal-version-conflict'
import { EventJournalUnavailable } from '../../../../application/ports/errors/event-journal-unavailable'
import { Country } from '../../../../domain/country'
import { EventSerializerNotFound } from '../../../../domain/errors/event-payload-handler'
import { ShipArrived } from '../../../../domain/events/ship-arrived'
import { ShipRegistered } from '../../../../domain/events/ship-registered'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { eventJournalContract } from '../event-journal-contract'
import { SqliteEventJournal } from './event-journal'

let directory: string
let fileNumber = 0
const journals: SqliteEventJournal[] = []
const databasePath = () => join(directory, `journal-${fileNumber++}.sqlite`)
const journalAt = (path: string): SqliteEventJournal => {
  const journal = new SqliteEventJournal(path)
  journals.push(journal)
  return journal
}
const port = () => new Port(new PortName('Kingston'), new Country('US'))
const registration = (id: string, name = 'King Roy') => new ShipRegistered(id, name, port())

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'ships-n-cargo-sqlite-'))
})

afterAll(async () => {
  journals.forEach((journal) => {
    journal.close()
  })
  await rm(directory, { recursive: true })
})

eventJournalContract(() => journalAt(databasePath()))

test('replays events after closing and reopening the same database file', async () => {
  const path = databasePath()
  const writer = journalAt(path)
  const events = [registration('ship-1'), new ShipArrived('ship-1', port())]
  await writer.append('ship-1', 0, events)
  writer.close()

  const reader = journalAt(path)
  await expect(reader.eventsByAggregate('ship-1')).resolves.toEqual({ events, version: 2 })
})

test('allows only one of two journal instances to append at the same expected version', async () => {
  const path = databasePath()
  const first = journalAt(path)
  const second = journalAt(path)

  const attempts = await Promise.allSettled([
    first.append('ship-1', 0, [registration('ship-1', 'First')]),
    second.append('ship-1', 0, [registration('ship-1', 'Second')])
  ])

  expect(attempts.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
  const rejected = attempts.find(({ status }) => status === 'rejected')
  expect(rejected).toMatchObject({ reason: expect.any(JournalVersionConflict) })
  await expect(first.eventsByAggregate('ship-1')).resolves.toMatchObject({ version: 1 })
})

test('rolls back every event when one row in a multi-event append fails', async () => {
  const path = databasePath()
  journalAt(path).close()
  const database = new DatabaseSync(path)
  database.exec(`
    CREATE TRIGGER reject_second_event
    BEFORE INSERT ON event_journal
    WHEN NEW.version = 2
    BEGIN
      SELECT RAISE(ABORT, 'test rejection');
    END;
  `)
  database.close()
  const journal = journalAt(path)

  await expect(
    journal.append('ship-1', 0, [registration('ship-1'), new ShipArrived('ship-1', port())])
  ).rejects.toThrow(EventJournalUnavailable)
  await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({ events: [], version: 0 })
})

test('classifies database operation failures as journal infrastructure failures', async () => {
  const journal = journalAt(databasePath())
  journal.close()

  await expect(journal.eventsByAggregate('ship-1')).rejects.toMatchObject({
    code: 'EVENT_JOURNAL_UNAVAILABLE',
    meta: { operation: 'eventsByAggregate' }
  })
  await expect(journal.append('ship-1', 0, [registration('ship-1')])).rejects.toMatchObject({
    code: 'EVENT_JOURNAL_UNAVAILABLE',
    meta: { operation: 'append' }
  })
})

test('does not disguise deserialization invariants as database failures', async () => {
  const path = databasePath()
  journalAt(path).close()
  const database = new DatabaseSync(path)
  database
    .prepare('INSERT INTO event_journal (aggregate_id, version, event_payload) VALUES (?, ?, ?)')
    .run(
      'ship-1',
      1,
      JSON.stringify({
        type: 'UnknownEvent',
        schemaVersion: 1,
        aggregateId: 'ship-1',
        occurredAt: '2024-01-02T03:04:05.000Z',
        recordedAt: '2024-01-03T04:05:06.000Z',
        data: {}
      })
    )
  database.close()

  await expect(journalAt(path).eventsByAggregate('ship-1')).rejects.toThrow(EventSerializerNotFound)
})
