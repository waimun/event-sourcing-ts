import { expect, test } from '@jest/globals'
import { SailShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name } from '../../../shared/domain/name'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { ShipNotFound } from './error'
import { CreateShipUseCase } from '../create-ship/use-case'
import { DockShipUseCase } from '../dock-ship/use-case'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Country } from '../../../domain/country'
import { InvalidPortForDeparture } from '../../../domain/errors/ship'

test('construct class object', () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('sail ship request', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('King Roy'), id)
  const events1 = await journal.eventsByAggregate(id.value)
  expect(events1.length).toEqual(1)

  const dockShipUseCase = new DockShipUseCase(journal)
  const port = new Port(new PortName('Henderson'), new Country('US'))
  await dockShipUseCase.dock(id, port)
  const events2 = await journal.eventsByAggregate(id.value)
  expect(events2.length).toEqual(2)

  const useCase = new SailShipUseCase(journal)
  await useCase.sail(id)
  const events3 = await journal.eventsByAggregate(id.value)
  expect(events3.length).toEqual(3)
})

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new SailShipUseCase(journal)
  const id = new Id('abc')
  await expect(useCase.sail(id)).rejects.toThrow(new ShipNotFound(id.value))
})

test('cannot depart from a missing port', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('King Roy'), id)
  const events = await journal.eventsByAggregate(id.value)
  expect(events.length).toEqual(1)
  // after ship is created, it has a missing port by default.

  const useCase = new SailShipUseCase(journal)
  await expect(useCase.sail(id)).rejects.toThrow(InvalidPortForDeparture)
})
