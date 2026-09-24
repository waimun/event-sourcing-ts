import { expect, test } from 'vitest'
import type { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import { Country } from '../../../domain/country'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipRegistered } from '../../../domain/events/ship-registered'
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
const registration = (id: string, name = 'King Roy') =>
  new ShipRegistered(id, name, new Port(new PortName('Kingston'), new Country('US')))

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
  const initialEvents = [registration('123'), arrival('123')]

  await journal.append('123', 0, initialEvents)
  expect(await journal.eventsByAggregate('123')).toEqual({ events: initialEvents, version: 2 })

  const subsequentArrival = arrival('123')
  await journal.append('123', 2, [subsequentArrival])
  expect(await journal.eventsByAggregate('123')).toEqual({
    events: [...initialEvents, subsequentArrival],
    version: 3
  })
})

test('different aggregates have independent versions', async () => {
  const journal = makeJournal()
  await journal.append('123', 0, [registration('123')])
  await journal.append('456', 0, [registration('456')])
  expect((await journal.eventsByAggregate('123')).version).toBe(1)
  expect((await journal.eventsByAggregate('456')).version).toBe(1)
})

test('stale append rejects with actual version and leaves stream unchanged', async () => {
  const journal = makeJournal()
  const registrationEvent = registration('123')
  await journal.append('123', 0, [registrationEvent])

  await expect(journal.append('123', 0, [arrival('123'), arrival('123')])).rejects.toMatchObject({
    code: 'JOURNAL_VERSION_CONFLICT',
    meta: { aggregateId: '123', expectedVersion: 0, actualVersion: 1 }
  } satisfies Partial<JournalVersionConflict>)
  expect(await journal.eventsByAggregate('123')).toEqual({
    events: [registrationEvent],
    version: 1
  })
})

test('rejects empty appends without changing the version', async () => {
  const journal = makeJournal()
  await expect(journal.append('123', 0, [])).rejects.toThrow(EventIsRequired)
  expect(await journal.eventsByAggregate('123')).toEqual({ events: [], version: 0 })
})

test('rejects mixed aggregate events atomically', async () => {
  const journal = makeJournal()
  await expect(journal.append('123', 0, [registration('123'), arrival('456')])).rejects.toThrow(
    AggregateIdMismatch
  )
  expect(await journal.eventsByAggregate('123')).toEqual({ events: [], version: 0 })
  expect(await journal.eventsByAggregate('456')).toEqual({ events: [], version: 0 })
})

test('rejects invalid expected versions', async () => {
  const journal = makeJournal()
  await expect(journal.append('123', -1, [registration('123')])).rejects.toThrow(
    InvalidExpectedVersion
  )
  await expect(journal.append('123', 0.5, [registration('123')])).rejects.toThrow(
    InvalidExpectedVersion
  )
})

test('retains serialized snapshots and returns immutable event views', async () => {
  const journal = makeJournal()
  const registrationEvent = registration('123')
  await journal.append('123', 0, [registrationEvent])
  const firstRead = await journal.eventsByAggregate('123')
  const secondRead = await journal.eventsByAggregate('123')

  expect(firstRead.events[0]).not.toBe(registrationEvent)
  expect(secondRead.events[0]).not.toBe(firstRead.events[0])
  expect(Object.isFrozen(firstRead)).toBe(true)
  expect(Object.isFrozen(firstRead.events)).toBe(true)
  expect(Object.isFrozen(firstRead.events[0])).toBe(true)
  expect(() => (firstRead.events as DomainEvent[]).push(arrival('123'))).toThrow(TypeError)
  expect(secondRead).toEqual({ events: [registrationEvent], version: 1 })
})
