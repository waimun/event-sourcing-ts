import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import { ShipNotAtPort, VoyageRequiredToDepart } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Ship } from '../../../domain/ship'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { PlanVoyageUseCase } from '../plan-voyage/use-case'
import { RegisterShipUseCase } from '../register-ship/use-case'
import { SailShipUseCase } from './use-case'

afterEach(() => vi.restoreAllMocks())

const initialPort = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Boston'), new Country('US'))
const register = (journal: EventJournal<string, DomainEvent>, id: Id) =>
  new RegisterShipUseCase(journal).register(new Name('King Roy'), id, initialPort)
const plan = (journal: EventJournal<string, DomainEvent>, id: Id) =>
  new PlanVoyageUseCase(journal).plan(id, destination)

test('sails a registered ship from its port', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await register(journal, id)
  await plan(journal, id)

  expect(await new SailShipUseCase(journal).sail(id)).toEqual({ ok: true, value: undefined })
  expect((await journal.eventsByAggregate(id.value)).events).toHaveLength(3)
})

test('requires a voyage plan before departure', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await register(journal, id)

  expect(await new SailShipUseCase(journal).sail(id)).toMatchObject({
    ok: false,
    error: new VoyageRequiredToDepart()
  })
})

test('returns ship not found for an absent ship', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  expect(await new SailShipUseCase(journal).sail(id)).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('rejects a second departure while the ship is at sea', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await register(journal, id)
  await plan(journal, id)
  await new SailShipUseCase(journal).sail(id)

  const result = await new SailShipUseCase(journal).sail(id)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toBeInstanceOf(ShipNotAtPort)
})

test('rechecks location after a concurrent departure wins', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await register(journal, id)
  await plan(journal, id)
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  const result = await new SailShipUseCase(journal).sail(id)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toBeInstanceOf(ShipNotAtPort)
})

test('does not turn an unexpected domain failure into a result', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await register(journal, id)
  const failure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'depart').mockImplementation(() => {
    throw failure
  })

  await expect(new SailShipUseCase(journal).sail(id)).rejects.toBe(failure)
})
