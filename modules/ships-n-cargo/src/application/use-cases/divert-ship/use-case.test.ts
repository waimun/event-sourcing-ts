import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import { ShipNotAtSea, VoyageDestinationUnchanged } from '../../../domain/errors/ship'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Ship } from '../../../domain/ship'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import { PlanVoyageUseCase } from '../plan-voyage/use-case'
import { RegisterShipUseCase } from '../register-ship/use-case'
import { SailShipUseCase } from '../sail-ship/use-case'
import { DivertShipUseCase } from './use-case'

afterEach(() => vi.restoreAllMocks())

const origin = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Boston'), new Country('US'))
const divertedDestination = new Port(new PortName('Belmont'), new Country('CA'))

const journalWithShipAtSea = async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, origin)
  await new PlanVoyageUseCase(journal).plan(id, destination)
  await new SailShipUseCase(journal).sail(id)
  return { id, journal }
}

test('replaces the destination of a ship active voyage at sea', async () => {
  const { id, journal } = await journalWithShipAtSea()

  expect(await new DivertShipUseCase(journal).divert(id, divertedDestination)).toEqual({
    ok: true,
    value: undefined
  })
  const { events } = await journal.eventsByAggregate(id.value)
  expect(events).toHaveLength(4)
  expect(events[3]).toMatchObject({
    type: 'VoyageDiverted',
    previousDestination: destination,
    destination: divertedDestination
  })
})

test('returns ship not found for an absent ship', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')

  expect(await new DivertShipUseCase(journal).divert(id, divertedDestination)).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('rejects diversion while the ship is at a port', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, origin)

  expect(await new DivertShipUseCase(journal).divert(id, divertedDestination)).toMatchObject({
    ok: false,
    error: new ShipNotAtSea('divert')
  })
})

test('rejects the current active destination', async () => {
  const { id, journal } = await journalWithShipAtSea()

  expect(await new DivertShipUseCase(journal).divert(id, destination)).toMatchObject({
    ok: false,
    error: new VoyageDestinationUnchanged()
  })
})

test('rechecks the destination when a concurrent diversion wins', async () => {
  const { id, journal } = await journalWithShipAtSea()
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  expect(await new DivertShipUseCase(journal).divert(id, divertedDestination)).toMatchObject({
    ok: false,
    error: new VoyageDestinationUnchanged()
  })
})

test('does not turn an unexpected domain failure into a result', async () => {
  const { id, journal } = await journalWithShipAtSea()
  const failure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'divert').mockImplementation(() => {
    throw failure
  })

  await expect(new DivertShipUseCase(journal).divert(id, divertedDestination)).rejects.toBe(failure)
})
