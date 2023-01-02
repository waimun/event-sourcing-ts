import { expect, test } from '@jest/globals'
import { DockShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { CreateShipUseCase } from '../create-ship/use-case'
import { ShipNotFound } from './error'
import { Name } from '../../../shared/domain/name'
import { Id } from '../../../shared/domain/id'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Country } from '../../../domain/country'
import { IsRequired } from '../../../shared/domain/errors/is-required'

test('construct class object', () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('create journal with empty name', () => {
  expect(() => new DockShipUseCase(new InMemoryEventJournal(new Name('')))).toThrow(IsRequired)
})

test('create journal with three white spaces', () => {
  expect(() => new DockShipUseCase(new InMemoryEventJournal(new Name('   ')))).toThrow(IsRequired)
})

test('dock ship request', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  createShipUseCase.create(new Name('testing'), new Id('abc'))
  expect(journal.eventsById('abc').length).toEqual(1)

  const useCase = new DockShipUseCase(journal)
  const id = new Id('abc')
  const port = new Port(new PortName('Henderson'), new Country('US'))
  useCase.dock(id, port)
  expect(journal.eventsById('abc').length).toEqual(2)
})

test('ship id not found', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new DockShipUseCase(journal)
  const id = new Id('abc')
  const port = new Port(new PortName('Henderson'), new Country('US'))
  expect(() => useCase.dock(id, port)).toThrow(new ShipNotFound(id.value))
})
