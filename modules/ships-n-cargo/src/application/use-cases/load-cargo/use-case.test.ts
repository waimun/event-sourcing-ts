import { expect, test } from '@jest/globals'
import { LoadCargoUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name } from '../../../shared/domain/name'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { ShipNotFound } from './error'
import { CreateShipUseCase } from '../create-ship/use-case'
import { CargoAlreadyLoaded } from '../../../domain/errors/ship'

test('construct class object', () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('ship id not found', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new LoadCargoUseCase(journal)
  const id = new Id('abc')

  expect(() => useCase.load(id, new Name('Refactoring Book'))).toThrow(new ShipNotFound(id.value))
})

test('cargo already loaded', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  createShipUseCase.create(new Name('Queen Mary'), id)
  expect(journal.eventsById(id.value).length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const cargoName = new Name('Refactoring Book')
  loadCargoUseCase.load(id, cargoName)
  expect(journal.eventsById(id.value).length).toEqual(2)

  // try to load the same cargo twice; cargo name is an unique identifier
  expect(() => {
    loadCargoUseCase.load(id, cargoName)
  }).toThrow(new CargoAlreadyLoaded(cargoName.value))

  // try to load the same cargo twice; cargo name is case-insensitive
  expect(() => {
    loadCargoUseCase.load(id, new Name('REFACTORING Book'))
  }).toThrow(new CargoAlreadyLoaded(new Name('REFACTORING Book').value))
})

test('valid request', () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  createShipUseCase.create(new Name('King Roy'), id)
  expect(journal.eventsById(id.value).length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  loadCargoUseCase.load(id, new Name('Refactoring Book'))
  expect(journal.eventsById(id.value).length).toEqual(2)
})
