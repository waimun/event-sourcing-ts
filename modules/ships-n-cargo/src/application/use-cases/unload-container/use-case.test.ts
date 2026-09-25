import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { CargoReference } from '../../../domain/cargo-reference'
import { Country } from '../../../domain/country'
import { ContainerNotFound, ShipNotAtPort } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Ship } from '../../../domain/ship'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { LoadContainerUseCase } from '../load-container/use-case'
import { PlanVoyageUseCase } from '../plan-voyage/use-case'
import { RegisterShipUseCase } from '../register-ship/use-case'
import { SailShipUseCase } from '../sail-ship/use-case'
import { UnloadContainerUseCase } from './use-case'

afterEach(() => {
  vi.restoreAllMocks()
})

const initialPort = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Boston'), new Country('US'))
const cargoReference = new CargoReference('cargo-1')

test('construct class object', () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new UnloadContainerUseCase(journal)
  const id = new Id('abc')

  expect(await useCase.unload(id, new Id('container-1'))).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('cannot find container to unload', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const registerShipUseCase = new RegisterShipUseCase(journal)
  const id = new Id('abc')
  await registerShipUseCase.register(new Name('Thomas Jefferson'), id, initialPort)
  const events = (await journal.eventsByAggregate(id.value)).events
  expect(events.length).toEqual(1)

  const unloadContainerUseCase = new UnloadContainerUseCase(journal)
  const containerId = new Id('container-1')
  expect(await unloadContainerUseCase.unload(id, containerId)).toMatchObject({
    ok: false,
    error: new ContainerNotFound(containerId.value)
  })
})

test('appends a container unload after loading', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const registerShipUseCase = new RegisterShipUseCase(journal)
  const id = new Id('abc')
  await registerShipUseCase.register(new Name('Thomas Jefferson'), id, initialPort)
  const eventsAfterRegistration = (await journal.eventsByAggregate(id.value)).events
  expect(eventsAfterRegistration).toHaveLength(1)

  const loadContainerUseCase = new LoadContainerUseCase(journal)
  const containerId = new Id('container-1')
  await loadContainerUseCase.load(id, containerId, cargoReference, new Name('Cloud Architecture'))
  const eventsAfterLoad = (await journal.eventsByAggregate(id.value)).events
  expect(eventsAfterLoad).toHaveLength(2)

  const unloadContainerUseCase = new UnloadContainerUseCase(journal)
  const result = await unloadContainerUseCase.unload(id, containerId)
  expect(result).toEqual({ ok: true, value: undefined })
  const eventsAfterUnload = (await journal.eventsByAggregate(id.value)).events
  expect(eventsAfterUnload).toHaveLength(3)
})

test('rechecks container after a concurrent unload wins', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  const containerId = new Id('container-1')
  await new RegisterShipUseCase(journal).register(new Name('Thomas Jefferson'), id, initialPort)
  await new LoadContainerUseCase(journal).load(
    id,
    containerId,
    cargoReference,
    new Name('Cloud Architecture')
  )
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  expect(await new UnloadContainerUseCase(journal).unload(id, containerId)).toMatchObject({
    ok: false,
    error: new ContainerNotFound(containerId.value)
  })
  expect((await journal.eventsByAggregate(id.value)).events).toHaveLength(3)
})

test('does not turn an unexpected domain failure into a result', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)
  const failure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'unloadContainer').mockImplementation(() => {
    throw failure
  })
  const append = vi.spyOn(journal, 'append')

  await expect(new UnloadContainerUseCase(journal).unload(id, new Id('container-1'))).rejects.toBe(
    failure
  )
  expect(append).not.toHaveBeenCalled()
})

test('rejects unloading while the ship is at sea', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  const containerId = new Id('container-1')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)
  await new LoadContainerUseCase(journal).load(
    id,
    containerId,
    cargoReference,
    new Name('Refactoring Book')
  )
  await new PlanVoyageUseCase(journal).plan(id, destination)
  await new SailShipUseCase(journal).sail(id)

  expect(await new UnloadContainerUseCase(journal).unload(id, containerId)).toMatchObject({
    ok: false,
    error: new ShipNotAtPort('unload a container')
  })
})
