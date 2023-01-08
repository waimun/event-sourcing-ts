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

test('construct class object', () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('dock ship request', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  createShipUseCase.create(new Name('Queen Mary'), id)
  expect(journal.eventsById(id.value).length).toEqual(1)

  const useCase = new DockShipUseCase(journal)
  const port = new Port(new PortName('Tennessee'), new Country('US'))
  useCase.dock(id, port)
  expect(journal.eventsById(id.value).length).toEqual(2)
})

test('ship id not found', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new DockShipUseCase(journal)
  const id = new Id('abc')
  const port = new Port(new PortName('Tennessee'), new Country('US'))
  expect(() => useCase.dock(id, port)).toThrow(new ShipNotFound(id.value))
})
