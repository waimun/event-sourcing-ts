import { expect, test } from '@jest/globals'
import { EventIsRequired, InMemoryEventJournal } from './in-memory-event-journal'
import { ShipCreated } from '../../domain/events/ship-created'
import { ShipArrived } from '../../domain/events/ship-arrived'
import { Port } from '../../domain/port'
import { Country } from '../../domain/country'
import { Name } from '../../shared/domain/name'
import { PortName } from '../../domain/port-name'
import { IsRequired } from '../../shared/domain/errors/is-required'

test('creation of the journal object', () => {
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

test('get events by aggregate id', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.appendEvents('123', new ShipCreated('123', 'King Roy'))
  const events = await journal.eventsById('123')
  expect(events.length).toEqual(1)
})

test('get events by aggregate id that does not exist', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  const events = await journal.eventsById('123')
  expect(events.length).toEqual(0)
})

test('append one event for the aggregate', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.appendEvents('123', new ShipCreated('123', 'King Roy'))
  const events = await journal.eventsById('123')
  expect(events.length).toEqual(1)
})

test('append two events for the same aggregate', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))

  const events = [
    new ShipCreated('123', 'King Roy'),
    new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US')))
  ]

  await journal.appendEvents('123', ...events)
  const result = await journal.eventsById('123')
  expect(result.length).toEqual(2)
})

test('append without any event specified', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await expect(journal.appendEvents('123')).rejects.toThrow(EventIsRequired)
})

test('appendEvents called twice', async () => {
  const journal = new InMemoryEventJournal(new Name('Test Journal'))
  await journal.appendEvents('123', new ShipCreated('123', 'King Roy'))
  await journal.appendEvents('123', new ShipArrived('123', new Port(new PortName('Kingston'), new Country('US'))))
  const events = await journal.eventsById('123')
  expect(events.length).toEqual(2)
})
