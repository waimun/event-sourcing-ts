import { expect, test } from '@jest/globals'
import { SailShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name } from '../../../shared/domain/name'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { ShipNotFound } from './error'
import { CreateShipUseCase } from '../create-ship/use-case'
import { DockShipUseCase } from '../dock-ship/use-case'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Country } from '../../../domain/country'
import { InvalidPortForDeparture } from '../../../domain/errors/ship'

test('construct class object', () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('sail ship request', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  createShipUseCase.create(new Name('King Roy'), id)
  expect(journal.eventsById(id.value).length).toEqual(1)

  const dockShipUseCase = new DockShipUseCase(journal)
  const port = new Port(new PortName('Henderson'), new Country('US'))
  dockShipUseCase.dock(id, port)
  expect(journal.eventsById(id.value).length).toEqual(2)

  const useCase = new SailShipUseCase(journal)
  useCase.sail(id)
  expect(journal.eventsById(id.value).length).toEqual(3)
})

test('ship id not found', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new SailShipUseCase(journal)
  const id = new Id('abc')
  expect(() => useCase.sail(id)).toThrow(new ShipNotFound(id.value))
})

test('cannot depart from a missing port', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  createShipUseCase.create(new Name('King Roy'), id)
  expect(journal.eventsById(id.value).length).toEqual(1)
  // after ship is created, it has a missing port by default.

  const useCase = new SailShipUseCase(journal)
  expect(() => useCase.sail(id)).toThrow(InvalidPortForDeparture)
})
