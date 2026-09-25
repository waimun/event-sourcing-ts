import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import {
  ShipNotAtPort,
  VoyageAlreadyPlanned,
  VoyageDestinationSameAsOrigin
} from '../../../domain/errors/ship'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Ship } from '../../../domain/ship'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import { RegisterShipUseCase } from '../register-ship/use-case'
import { SailShipUseCase } from '../sail-ship/use-case'
import { PlanVoyageUseCase } from './use-case'

afterEach(() => vi.restoreAllMocks())

const origin = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Boston'), new Country('US'))

const registeredJournal = async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, origin)
  return { id, journal }
}

test('plans a port-to-port voyage for a registered ship', async () => {
  const { id, journal } = await registeredJournal()

  expect(await new PlanVoyageUseCase(journal).plan(id, destination)).toEqual({
    ok: true,
    value: undefined
  })
  const { events } = await journal.eventsByAggregate(id.value)
  expect(events).toHaveLength(2)
  expect(events[1]).toMatchObject({
    type: 'VoyagePlanned',
    origin,
    destination
  })
})

test('returns ship not found for an absent ship', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')

  expect(await new PlanVoyageUseCase(journal).plan(id, destination)).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('rejects the origin as destination and a second active voyage', async () => {
  const { id, journal } = await registeredJournal()
  const useCase = new PlanVoyageUseCase(journal)

  expect(await useCase.plan(id, origin)).toMatchObject({
    ok: false,
    error: new VoyageDestinationSameAsOrigin()
  })
  expect(await useCase.plan(id, destination)).toEqual({ ok: true, value: undefined })
  expect(
    await useCase.plan(id, new Port(new PortName('Belmont'), new Country('CA')))
  ).toMatchObject({ ok: false, error: new VoyageAlreadyPlanned() })
})

test('rechecks the active voyage when a concurrent plan wins', async () => {
  const { id, journal } = await registeredJournal()
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  expect(await new PlanVoyageUseCase(journal).plan(id, destination)).toMatchObject({
    ok: false,
    error: new VoyageAlreadyPlanned()
  })
})

test('rejects planning while the ship is at sea', async () => {
  const { id, journal } = await registeredJournal()
  await new PlanVoyageUseCase(journal).plan(id, destination)
  await new SailShipUseCase(journal).sail(id)

  expect(
    await new PlanVoyageUseCase(journal).plan(
      id,
      new Port(new PortName('Belmont'), new Country('CA'))
    )
  ).toMatchObject({ ok: false, error: new ShipNotAtPort('plan a voyage') })
})

test('does not turn an unexpected domain failure into a result', async () => {
  const { id, journal } = await registeredJournal()
  const failure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'planVoyage').mockImplementation(() => {
    throw failure
  })

  await expect(new PlanVoyageUseCase(journal).plan(id, destination)).rejects.toBe(failure)
})
