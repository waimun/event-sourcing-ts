import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import { ShipNotAtPort, VoyageRequiredToCancel } from '../../../domain/errors/ship'
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
import { CancelVoyageUseCase } from './use-case'

afterEach(() => vi.restoreAllMocks())

const origin = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Boston'), new Country('US'))
const reason = new VoyageChangeReason('Charterer cancelled')

const journalWithPlannedVoyage = async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, origin)
  await new PlanVoyageUseCase(journal).plan(id, destination)
  return { id, journal }
}

test('cancels an active voyage and preserves its snapshot', async () => {
  const { id, journal } = await journalWithPlannedVoyage()

  expect(await new CancelVoyageUseCase(journal).cancel(id, reason)).toEqual({
    ok: true,
    value: undefined
  })
  const { events } = await journal.eventsByAggregate(id.value)
  expect(events.at(-1)).toMatchObject({
    type: 'VoyageCancelled',
    origin,
    destination,
    reason: reason.value
  })
  expect(await new PlanVoyageUseCase(journal).plan(id, destination)).toEqual({
    ok: true,
    value: undefined
  })
})

test('returns expected missing, location, and voyage failures', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  const useCase = new CancelVoyageUseCase(journal)

  expect(await useCase.cancel(id, reason)).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, origin)
  expect(await useCase.cancel(id, reason)).toMatchObject({
    ok: false,
    error: new VoyageRequiredToCancel()
  })
  await new PlanVoyageUseCase(journal).plan(id, destination)
  await new SailShipUseCase(journal).sail(id)
  expect(await useCase.cancel(id, reason)).toMatchObject({
    ok: false,
    error: new ShipNotAtPort('cancel a voyage')
  })
})

test('rechecks the voyage when a concurrent cancellation wins', async () => {
  const { id, journal } = await journalWithPlannedVoyage()
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  expect(await new CancelVoyageUseCase(journal).cancel(id, reason)).toMatchObject({
    ok: false,
    error: new VoyageRequiredToCancel()
  })
})

test('does not turn unexpected domain or journal failures into results', async () => {
  const { id, journal } = await journalWithPlannedVoyage()
  const domainFailure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'cancelVoyage').mockImplementationOnce(() => {
    throw domainFailure
  })
  await expect(new CancelVoyageUseCase(journal).cancel(id, reason)).rejects.toBe(domainFailure)

  const journalFailure = new Error('journal unavailable')
  vi.spyOn(journal, 'append').mockRejectedValueOnce(journalFailure)
  await expect(new CancelVoyageUseCase(journal).cancel(id, reason)).rejects.toBe(journalFailure)
})
