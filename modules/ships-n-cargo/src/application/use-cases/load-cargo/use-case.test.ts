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

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new LoadCargoUseCase(journal)
  const id = new Id('abc')

  await expect(useCase.load(id, new Name('Refactoring Book'))).rejects.toThrow(new ShipNotFound(id.value))
})

test('cargo already loaded', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Queen Mary'), id)
  const events1 = await journal.eventsByAggregate(id.value)
  expect(events1.length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const cargoName = new Name('Refactoring Book')
  await loadCargoUseCase.load(id, cargoName)
  const events2 = await journal.eventsByAggregate(id.value)
  expect(events2.length).toEqual(2)

  // try to load the same cargo twice; cargo name is an unique identifier
  await expect(loadCargoUseCase.load(id, cargoName))
    .rejects.toThrow(new CargoAlreadyLoaded(cargoName.value))

  // try to load the same cargo twice; cargo name is case-insensitive
  await expect(loadCargoUseCase.load(id, new Name('REFACTORING Book')))
    .rejects.toThrow(new CargoAlreadyLoaded(new Name('REFACTORING Book').value))
})

test('valid request', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('King Roy'), id)
  const events1 = await journal.eventsByAggregate(id.value)
  expect(events1.length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  await loadCargoUseCase.load(id, new Name('Refactoring Book'))
  const events2 = await journal.eventsByAggregate(id.value)
  expect(events2.length).toEqual(2)
})
