import { expect, test } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { CargoNotFound } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { CreateShipUseCase } from '../create-ship/use-case'
import { LoadCargoUseCase } from '../load-cargo/use-case'
import { UnloadCargoUseCase } from './use-case'

test('construct class object', () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new UnloadCargoUseCase(journal)
  const id = new Id('abc')

  expect(await useCase.unload(id, new Name('Refactoring Book'))).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('cannot find cargo to unload', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Thomas Jefferson'), id)
  const events = (await journal.eventsByAggregate(id.value)).events
  expect(events.length).toEqual(1)

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  const cargoName = new Name('Cloud Architecture')
  expect(await unloadCargoUseCase.unload(id, cargoName)).toMatchObject({
    ok: false,
    error: new CargoNotFound(cargoName.value)
  })
})

test('valid request', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Thomas Jefferson'), id)
  const events1 = (await journal.eventsByAggregate(id.value)).events
  expect(events1.length).toEqual(1)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const cargoName = new Name('Cloud Architecture')
  await loadCargoUseCase.load(id, cargoName)
  const events2 = (await journal.eventsByAggregate(id.value)).events
  expect(events2.length).toEqual(2)

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  const result = await unloadCargoUseCase.unload(id, cargoName)
  expect(result).toEqual({ ok: true, value: undefined })
  const events3 = (await journal.eventsByAggregate(id.value)).events
  expect(events3.length).toEqual(3)
})
