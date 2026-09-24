import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { CargoReference } from '../../../domain/cargo-reference'
import { Country } from '../../../domain/country'
import { ContainerAlreadyLoaded, ShipNotAtPort } from '../../../domain/errors/ship'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Ship } from '../../../domain/ship'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import { ShipNotFound } from '../../errors/ship-not-found'
import type { EventJournal } from '../../ports/event-journal'
import { RegisterShipUseCase } from '../register-ship/use-case'
import { SailShipUseCase } from '../sail-ship/use-case'
import { LoadContainerUseCase } from './use-case'

afterEach(() => {
  vi.restoreAllMocks()
})

const initialPort = new Port(new PortName('Kingston'), new Country('US'))
const cargoReference = new CargoReference('cargo-1')

test('construct class object', () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new LoadContainerUseCase(journal)
  const id = new Id('abc')

  expect(
    await useCase.load(id, new Id('container-1'), cargoReference, new Name('Refactoring Book'))
  ).toMatchObject({
    ok: false,
    error: new ShipNotFound(id.value)
  })
})

test('container already loaded', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const registerShipUseCase = new RegisterShipUseCase(journal)
  const id = new Id('abc')
  await registerShipUseCase.register(new Name('Queen Mary'), id, initialPort)
  const eventsAfterRegistration = (await journal.eventsByAggregate(id.value)).events
  expect(eventsAfterRegistration).toHaveLength(1)

  const loadContainerUseCase = new LoadContainerUseCase(journal)
  const containerId = new Id('container-1')
  const description = new Name('Refactoring Book')
  await loadContainerUseCase.load(id, containerId, cargoReference, description)
  const eventsAfterInitialLoad = (await journal.eventsByAggregate(id.value)).events
  expect(eventsAfterInitialLoad).toHaveLength(2)

  expect(
    await loadContainerUseCase.load(id, containerId, cargoReference, description)
  ).toMatchObject({
    ok: false,
    error: new ContainerAlreadyLoaded(containerId.value)
  })

  expect(
    await loadContainerUseCase.load(
      id,
      new Id('container-2'),
      cargoReference,
      new Name('Refactoring Book')
    )
  ).toEqual({ ok: true, value: undefined })
})

test('appends a container load after ship registration', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const registerShipUseCase = new RegisterShipUseCase(journal)
  const id = new Id('abc')
  await registerShipUseCase.register(new Name('King Roy'), id, initialPort)
  const eventsAfterRegistration = (await journal.eventsByAggregate(id.value)).events
  expect(eventsAfterRegistration).toHaveLength(1)

  const loadContainerUseCase = new LoadContainerUseCase(journal)
  const result = await loadContainerUseCase.load(
    id,
    new Id('container-1'),
    cargoReference,
    new Name('Refactoring Book')
  )
  expect(result).toEqual({ ok: true, value: undefined })
  const eventsAfterLoad = (await journal.eventsByAggregate(id.value)).events
  expect(eventsAfterLoad).toHaveLength(2)
})

test('rechecks container after a concurrent load wins', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  const containerId = new Id('container-1')
  expect(
    await new LoadContainerUseCase(journal).load(
      id,
      containerId,
      cargoReference,
      new Name('Refactoring Book')
    )
  ).toMatchObject({
    ok: false,
    error: new ContainerAlreadyLoaded(containerId.value)
  })
  expect((await journal.eventsByAggregate(id.value)).events).toHaveLength(2)
})

test('does not turn an exceptional journal failure into a result', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)
  const failure = new Error('journal failed')
  vi.spyOn(journal, 'append').mockRejectedValue(failure)

  await expect(
    new LoadContainerUseCase(journal).load(
      id,
      new Id('container-1'),
      cargoReference,
      new Name('Refactoring Book')
    )
  ).rejects.toBe(failure)
})

test('does not turn an unexpected domain failure into a result', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)
  const failure = new Error('unexpected domain failure')
  vi.spyOn(Ship, 'loadContainer').mockImplementation(() => {
    throw failure
  })
  const append = vi.spyOn(journal, 'append')

  await expect(
    new LoadContainerUseCase(journal).load(
      id,
      new Id('container-1'),
      cargoReference,
      new Name('Refactoring Book')
    )
  ).rejects.toBe(failure)
  expect(append).not.toHaveBeenCalled()
})

test('rejects loading while the ship is at sea', async () => {
  const journal = new InMemoryEventJournal(new Name('testing'))
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(new Name('Queen Mary'), id, initialPort)
  await new SailShipUseCase(journal).sail(id)

  expect(
    await new LoadContainerUseCase(journal).load(
      id,
      new Id('container-1'),
      cargoReference,
      new Name('Refactoring Book')
    )
  ).toMatchObject({ ok: false, error: new ShipNotAtPort('load a container') })
})
