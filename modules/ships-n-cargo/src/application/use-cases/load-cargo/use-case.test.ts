import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { CargoAlreadyLoaded } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Ship } from '../../../domain/ship'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { CreateShipUseCase } from '../create-ship/use-case'
import { LoadCargoUseCase } from './use-case'

afterEach(() => {
  vi.restoreAllMocks()
})

test('construct class object', () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new LoadCargoUseCase(journal)
  const id = new Id('abc')

  expect(await useCase.load(id, new Name('Refactoring Book'))).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('cargo already loaded', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Queen Mary'), id)
  const events1 = (await journal.eventsByAggregate(id.value)).events
  expect(events1.length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const cargoName = new Name('Refactoring Book')
  await loadCargoUseCase.load(id, cargoName)
  const events2 = (await journal.eventsByAggregate(id.value)).events
  expect(events2.length).toEqual(2)

  // try to load the same cargo twice; cargo name is an unique identifier
  expect(await loadCargoUseCase.load(id, cargoName)).toMatchObject({
    ok: false,
    error: new CargoAlreadyLoaded(cargoName.value)
  })

  // try to load the same cargo twice; cargo name is case-insensitive
  expect(await loadCargoUseCase.load(id, new Name('REFACTORING Book'))).toMatchObject({
    ok: false,
    error: new CargoAlreadyLoaded(new Name('REFACTORING Book').value)
  })
})

test('valid request', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('King Roy'), id)
  const events1 = (await journal.eventsByAggregate(id.value)).events
  expect(events1.length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const result = await loadCargoUseCase.load(id, new Name('Refactoring Book'))
  expect(result).toEqual({ ok: true, value: undefined })
  const events2 = (await journal.eventsByAggregate(id.value)).events
  expect(events2.length).toEqual(2)
})

test('does not turn an exceptional journal failure into a result', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new CreateShipUseCase(journal).create(new Name('Queen Mary'), id)
  const failure = new Error('journal failed')
  vi.spyOn(journal, 'append').mockRejectedValue(failure)

  await expect(new LoadCargoUseCase(journal).load(id, new Name('Refactoring Book'))).rejects.toBe(
    failure
  )
})

test('does not turn an unexpected domain failure into a result', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new CreateShipUseCase(journal).create(new Name('Queen Mary'), id)
  const failure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'loadCargo').mockImplementation(() => {
    throw failure
  })
  const append = vi.spyOn(journal, 'append')

  await expect(new LoadCargoUseCase(journal).load(id, new Name('Refactoring Book'))).rejects.toBe(
    failure
  )
  expect(append).not.toHaveBeenCalled()
})
