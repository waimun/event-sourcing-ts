import { expect, test } from '@jest/globals'
import { DockShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { NameNotAllowed } from '../../../shared/validators/name'
import { DockShipDto } from './dock-ship-dto'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { CreateShipDto } from '../create-ship/create-ship-dto'
import { CreateShipUseCase } from '../create-ship/use-case'
import { ShipNotFound } from './error'

test('construct class object', () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(useCase).toBeTruthy()
})

test('create journal with empty name', () => {
  expect(() => new DockShipUseCase(new InMemoryEventJournal(''))).toThrow(NameNotAllowed)
})

test('create journal with three white spaces', () => {
  expect(() => new DockShipUseCase(new InMemoryEventJournal('   '))).toThrow(NameNotAllowed)
})

test('dock ship request', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal('testing')

  const createRequest: CreateShipDto = { id: 'abc', name: 'testing' }
  const createShipUseCase = new CreateShipUseCase(journal)
  createShipUseCase.create(createRequest)
  expect(journal.eventsById('abc').length).toEqual(1)

  const useCase = new DockShipUseCase(journal)
  const request: DockShipDto = { id: 'abc', port: { name: 'Henderson', country: 'US' } }
  useCase.dock(request)
  expect(journal.eventsById('abc').length).toEqual(2)
})

test('ship id not found', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal('testing')

  const useCase = new DockShipUseCase(journal)
  const request: DockShipDto = { id: 'abc', port: { name: 'Henderson', country: 'US' } }
  expect(() => useCase.dock(request)).toThrow(new ShipNotFound(request.id))
})
