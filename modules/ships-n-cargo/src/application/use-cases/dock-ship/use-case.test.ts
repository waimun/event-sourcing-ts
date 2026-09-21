import { expect, test } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import {
  CannotDockShipAtSea,
  CannotDockWithoutPort,
  NoCountrySpecifiedForPort
} from '../../../domain/errors/dock-ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { CreateShipUseCase } from '../create-ship/use-case'
import { DockShipUseCase } from './use-case'

test('construct class object', () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('dock ship request', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Queen Mary'), id)
  const events1 = await journal.eventsByAggregate(id.value)
  expect(events1.length).toEqual(1)

  const useCase = new DockShipUseCase(journal)
  const port = new Port(new PortName('Tennessee'), new Country('US'))
  const result = await useCase.dock(id, port)
  expect(result).toEqual({ ok: true, value: undefined })
  const events2 = await journal.eventsByAggregate(id.value)
  expect(events2.length).toEqual(2)
})

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new DockShipUseCase(journal)
  const id = new Id('abc')
  const port = new Port(new PortName('Tennessee'), new Country('US'))
  expect(await useCase.dock(id, port)).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test.each([
  [Port.atSea(), CannotDockShipAtSea],
  [Port.none(), CannotDockWithoutPort],
  [new Port(new PortName('Tennessee'), new Country('NO_COUNTRY')), NoCountrySpecifiedForPort]
])('returns an invalid dock command as a failed result', async (port, errorType) => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const result = await new DockShipUseCase(journal).dock(new Id('abc'), port)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toBeInstanceOf(errorType)
})
