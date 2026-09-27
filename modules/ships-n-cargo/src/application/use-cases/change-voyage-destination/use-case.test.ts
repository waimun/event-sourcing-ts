import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import {
  ShipNotAtPort,
  VoyageDestinationSameAsOrigin,
  VoyageDestinationUnchanged,
  VoyageRequiredToChangeDestination
} from '../../../domain/errors/ship'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Ship } from '../../../domain/ship'
import { VoyageChangeReason } from '../../../domain/voyage-change-reason'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import { PlanVoyageUseCase } from '../plan-voyage/use-case'
import { RegisterShipUseCase } from '../register-ship/use-case'
import { SailShipUseCase } from '../sail-ship/use-case'
import { ChangeVoyageDestinationUseCase } from './use-case'

afterEach(() => vi.restoreAllMocks())

const origin = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Boston'), new Country('US'))
const changedDestination = new Port(new PortName('Belmont'), new Country('CA'))
const reason = new VoyageChangeReason('Berth unavailable')

const journalWithPlannedVoyage = async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, origin)
  await new PlanVoyageUseCase(journal).plan(id, destination)
  return { id, journal }
}

test('changes an active voyage destination before departure', async () => {
  const { id, journal } = await journalWithPlannedVoyage()

  expect(
    await new ChangeVoyageDestinationUseCase(journal).change(id, changedDestination, reason)
  ).toEqual({ ok: true, value: undefined })
  const { events } = await journal.eventsByAggregate(id.value)
  expect(events.at(-1)).toMatchObject({
    type: 'VoyageDestinationChanged',
    previousDestination: destination,
    destination: changedDestination,
    reason: reason.value
  })
})

test('returns expected missing, location, voyage, and destination failures', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  const useCase = new ChangeVoyageDestinationUseCase(journal)

  expect(await useCase.change(id, changedDestination, reason)).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, origin)
  expect(await useCase.change(id, changedDestination, reason)).toMatchObject({
    ok: false,
    error: new VoyageRequiredToChangeDestination()
  })
  await new PlanVoyageUseCase(journal).plan(id, destination)
  expect(await useCase.change(id, destination, reason)).toMatchObject({
    ok: false,
    error: new VoyageDestinationUnchanged()
  })
  expect(await useCase.change(id, origin, reason)).toMatchObject({
    ok: false,
    error: new VoyageDestinationSameAsOrigin()
  })
  await new SailShipUseCase(journal).sail(id)
  expect(await useCase.change(id, changedDestination, reason)).toMatchObject({
    ok: false,
    error: new ShipNotAtPort('change a voyage destination')
  })
})

test('rechecks the voyage when a concurrent destination change wins', async () => {
  const { id, journal } = await journalWithPlannedVoyage()
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  expect(
    await new ChangeVoyageDestinationUseCase(journal).change(id, changedDestination, reason)
  ).toMatchObject({ ok: false, error: new VoyageDestinationUnchanged() })
})

test('does not turn unexpected domain or journal failures into results', async () => {
  const { id, journal } = await journalWithPlannedVoyage()
  const domainFailure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'changeVoyageDestination').mockImplementationOnce(() => {
    throw domainFailure
  })
  await expect(
    new ChangeVoyageDestinationUseCase(journal).change(id, changedDestination, reason)
  ).rejects.toBe(domainFailure)

  const journalFailure = new Error('journal unavailable')
  vi.spyOn(journal, 'append').mockRejectedValueOnce(journalFailure)
  await expect(
    new ChangeVoyageDestinationUseCase(journal).change(id, changedDestination, reason)
  ).rejects.toBe(journalFailure)
})
