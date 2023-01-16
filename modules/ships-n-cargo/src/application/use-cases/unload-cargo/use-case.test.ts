import { expect, test } from '@jest/globals'
import { UnloadCargoUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name } from '../../../shared/domain/name'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { ShipNotFound } from '../unload-cargo/error'
import { CreateShipUseCase } from '../create-ship/use-case'
import { CargoNotFound } from '../../../domain/errors/ship'
import { LoadCargoUseCase } from '../load-cargo/use-case'

test('construct class object', () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('ship id not found', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new UnloadCargoUseCase(journal)
  const id = new Id('abc')

  expect(() => useCase.unload(id, new Name('Refactoring Book'))).toThrow(new ShipNotFound(id.value))
})

test('cannot find cargo to unload', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  createShipUseCase.create(new Name('Thomas Jefferson'), id)
  expect(journal.eventsById(id.value).length).toEqual(1)

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  const cargoName = new Name('Cloud Architecture')
  expect(() => unloadCargoUseCase.unload(id, cargoName)).toThrow(new CargoNotFound(cargoName.value))
})

test('valid request', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  createShipUseCase.create(new Name('Thomas Jefferson'), id)
  expect(journal.eventsById(id.value).length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const cargoName = new Name('Cloud Architecture')
  loadCargoUseCase.load(id, cargoName)
  expect(journal.eventsById(id.value).length).toEqual(2)

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  unloadCargoUseCase.unload(id, cargoName)
  expect(journal.eventsById(id.value).length).toEqual(3)
})
