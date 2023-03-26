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

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new UnloadCargoUseCase(journal)
  const id = new Id('abc')

  await expect(useCase.unload(id, new Name('Refactoring Book'))).rejects.toThrow(new ShipNotFound(id.value))
})

test('cannot find cargo to unload', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Thomas Jefferson'), id)
  const events = await journal.eventsByAggregate(id.value)
  expect(events.length).toEqual(1)

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  const cargoName = new Name('Cloud Architecture')
  await expect(unloadCargoUseCase.unload(id, cargoName)).rejects.toThrow(new CargoNotFound(cargoName.value))
})

test('valid request', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Thomas Jefferson'), id)
  const events1 = await journal.eventsByAggregate(id.value)
  expect(events1.length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const cargoName = new Name('Cloud Architecture')
  await loadCargoUseCase.load(id, cargoName)
  const events2 = await journal.eventsByAggregate(id.value)
  expect(events2.length).toEqual(2)

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  await unloadCargoUseCase.unload(id, cargoName)
  const events3 = await journal.eventsByAggregate(id.value)
  expect(events3.length).toEqual(3)
})
