import { expect, test } from '@jest/globals'
import { EntryAlreadyExists, EntryDoesNotExist, EventIsRequired, InMemoryEventJournal } from './in-memory-event-journal'
import { ShipCreated } from '../../domain/events/ship-created'
import { ShipArrived } from '../../domain/events/ship-arrived'
import { Port } from '../../domain/port'
import { ShipDeparted } from '../../domain/events/ship-departed'
import { Country } from '../../domain/country'
import { Name } from '../../shared/domain/name'
import { PortName } from '../../domain/port-name'

test('creation of the class object', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  expect(journal).toBeTruthy()
  expect(journal.name).toEqual('Test Journal')
  expect(journal.entries.size).toEqual(0)
})

test('new entry with one event', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  expect(journal.entries.size).toEqual(1)
})

test('new entry with two events', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  const events = [
    new ShipCreated('123', 'King Roy'),
    new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US')))
  ]

  journal.newEntry('123', ...events)
  expect(journal.entries.size).toEqual(1)
})

test('new entry without any event', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  expect(() => journal.newEntry('123')).toThrow(EventIsRequired)
})

test('new entry with an id that already exists', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  expect(journal.entries.size).toEqual(1)

  expect(() => {
    journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  }).toThrow(new EntryAlreadyExists('123'))
})

test('get events by id', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  expect(journal.eventsById('123').length).toEqual(1)
})

test('get events by id that does not exist', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  expect(journal.eventsById('123').length).toEqual(0)
})

test('append with one event', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  journal.appendEvents('123', new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US'))))
  expect(journal.eventsById('123').length).toEqual(2)
})

test('append with two events', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  journal.newEntry('123', new ShipCreated('123', 'King Roy'))

  const events = [
    new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US'))),
    new ShipDeparted('123')
  ]

  journal.appendEvents('123', ...events)
  expect(journal.eventsById('123').length).toEqual(3)
})

test('append without any event', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  journal.newEntry('123', new ShipCreated('123', 'King Roy'))
  expect(() => journal.appendEvents('123')).toThrow(EventIsRequired)
})

test('append to an id that does not exist in the journal', () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  expect(() =>
    journal.appendEvents('123', new ShipCreated('123', 'King Roy'))
  ).toThrow(new EntryDoesNotExist('123'))
})
