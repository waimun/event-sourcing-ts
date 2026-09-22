import { expect, test } from 'vitest'
import type { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import { Country } from '../../../domain/country'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipCreated } from '../../../domain/events/ship-created'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { Name } from '../../../shared/domain/name'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion
} from './errors/event-journal'
import { InMemoryEventJournal } from './in-memory-event-journal'

const makeJournal = () => new InMemoryEventJournal(new Name('Test Journal'))
const arrival = (id: string) =>
  new ShipArrived(id, new Port(new PortName('Kingston'), new Country('US')))

test('creates a named, empty journal', async () => {
  const journal = makeJournal()
  expect(journal.name).toBe('Test Journal')
  expect(await journal.eventsByAggregate('123')).toEqual({ events: [], version: 0 })
})

test('requires a journal name', () => {
  expect(() => new InMemoryEventJournal(new Name(''))).toThrow(IsRequired)
  expect(() => new InMemoryEventJournal(new Name('   '))).toThrow(IsRequired)
})

test('missing streams start at version zero', async () => {
  expect(await makeJournal().eventsByAggregate('123')).toEqual({ events: [], version: 0 })
})

test('multi-event append advances one stream by consecutive versions', async () => {
  const journal = makeJournal()
  const events = [new ShipCreated('123', 'King Roy'), arrival('123')]

  await journal.append('123', 0, events)
  expect(await journal.eventsByAggregate('123')).toEqual({ events, version: 2 })

  const next = arrival('123')
  await journal.append('123', 2, [next])
  expect(await journal.eventsByAggregate('123')).toEqual({
    events: [...events, next],
    version: 3
  })
})

test('different aggregates have independent versions', async () => {
  const journal = makeJournal()
  await journal.append('123', 0, [new ShipCreated('123', 'King Roy')])
  await journal.append('456', 0, [new ShipCreated('456', 'King Roy')])
  expect((await journal.eventsByAggregate('123')).version).toBe(1)
  expect((await journal.eventsByAggregate('456')).version).toBe(1)
})

test('stale append rejects with actual version and leaves stream unchanged', async () => {
  const journal = makeJournal()
  const first = new ShipCreated('123', 'King Roy')
  await journal.append('123', 0, [first])

  await expect(journal.append('123', 0, [arrival('123'), arrival('123')])).rejects.toMatchObject({
    code: 'JOURNAL_VERSION_CONFLICT',
    meta: { aggregateId: '123', expectedVersion: 0, actualVersion: 1 }
  } satisfies Partial<JournalVersionConflict>)
  expect(await journal.eventsByAggregate('123')).toEqual({ events: [first], version: 1 })
})

test('rejects empty appends without changing the version', async () => {
  const journal = makeJournal()
  await expect(journal.append('123', 0, [])).rejects.toThrow(EventIsRequired)
  expect(await journal.eventsByAggregate('123')).toEqual({ events: [], version: 0 })
})

test('rejects mixed aggregate events atomically', async () => {
  const journal = makeJournal()
  await expect(
    journal.append('123', 0, [new ShipCreated('123', 'King Roy'), arrival('456')])
  ).rejects.toThrow(AggregateIdMismatch)
  expect(await journal.eventsByAggregate('123')).toEqual({ events: [], version: 0 })
  expect(await journal.eventsByAggregate('456')).toEqual({ events: [], version: 0 })
})

test('rejects invalid expected versions', async () => {
  const journal = makeJournal()
  await expect(journal.append('123', -1, [new ShipCreated('123', 'King Roy')])).rejects.toThrow(
    InvalidExpectedVersion
  )
  await expect(journal.append('123', 0.5, [new ShipCreated('123', 'King Roy')])).rejects.toThrow(
    InvalidExpectedVersion
  )
})

test('reads return snapshots that cannot change stored events or versions', async () => {
  const journal = makeJournal()
  const first = new ShipCreated('123', 'King Roy')
  await journal.append('123', 0, [first])
  const read = await journal.eventsByAggregate('123')
  read.events.push(arrival('123'))
  expect(await journal.eventsByAggregate('123')).toEqual({ events: [first], version: 1 })
})
