import { expect, test } from '@jest/globals'
import { EntryAlreadyExists, EntryDoesNotExist, EventIsRequired, InMemoryEventJournal } from './in-memory-event-journal'
import { ShipCreated } from '../../domain/events/ship-created'
import { ShipArrived } from '../../domain/events/ship-arrived'
import { Port } from '../../domain/port'
import { ShipDeparted } from '../../domain/events/ship-departed'
import { Country } from '../../domain/country'
import { Name } from '../../shared/domain/name'
import { PortName } from '../../domain/port-name'
import { IsRequired } from '../../shared/domain/errors/is-required'

test('creation of the class object', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  expect(journal).toBeTruthy()
  expect(journal.name).toEqual('Test Journal')
  expect(journal.entries.size).toEqual(0)
})

test('create journal with empty name', () => {
  expect(() => new InMemoryEventJournal(new Name(''))).toThrow(IsRequired)
})

test('create journal with three white spaces', () => {
  expect(() => new InMemoryEventJournal(new Name('   '))).toThrow(IsRequired)
})

test('new entry with one event', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  expect(journal.entries.size).toEqual(1)
})

test('new entry with two events', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  const events = [
    new ShipCreated('123', 'King Roy'),
    new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US')))
  ]

  await journal.newEntry('123', ...events)
  expect(journal.entries.size).toEqual(1)
})

test('new entry without any event', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await expect(journal.newEntry('123')).rejects.toThrow(EventIsRequired)
})

test('new entry with an id that already exists', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  expect(journal.entries.size).toEqual(1)

  await expect(journal.newEntry('123', new ShipCreated('123', 'King Roy')))
    .rejects.toThrow(new EntryAlreadyExists('123'))
})

test('get events by id', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  const events = await journal.eventsById('123')
  expect(events.length).toEqual(1)
})

test('get events by id that does not exist', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  const events = await journal.eventsById('123')
  expect(events.length).toEqual(0)
})

test('append with one event', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  await journal.appendEvents('123', new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US'))))
  const events = await journal.eventsById('123')
  expect(events.length).toEqual(2)
})

test('append with two events', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.newEntry('123', new ShipCreated('123', 'King Roy'))

  const events = [
    new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US'))),
    new ShipDeparted('123')
  ]

  await journal.appendEvents('123', ...events)
  const result = await journal.eventsById('123')
  expect(result.length).toEqual(3)
})

test('append without any event', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  await expect(journal.appendEvents('123')).rejects.toThrow(EventIsRequired)
})

test('append to an id that does not exist in the journal', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await expect(journal.appendEvents('123', new ShipCreated('123', 'King Roy')))
    .rejects.toThrow(new EntryDoesNotExist('123'))
})
