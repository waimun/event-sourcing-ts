import { expect, test } from '@jest/globals'
import { DockShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { CreateShipUseCase } from '../create-ship/use-case'
import { ShipNotFound } from './error'
import { Name } from '../../../shared/domain/name'
import { Id } from '../../../shared/domain/id'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Country } from '../../../domain/country'

test('construct class object', () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('dock ship request', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const id = new Id('abc')
  await createShipUseCase.create(new Name('Queen Mary'), id)
  const events1 = await journal.eventsById(id.value)
  expect(events1.length).toEqual(1)

  const useCase = new DockShipUseCase(journal)
  const port = new Port(new PortName('Tennessee'), new Country('US'))
  await useCase.dock(id, port)
  const events2 = await journal.eventsById(id.value)
  expect(events2.length).toEqual(2)
})

test('ship id not found', async () => {
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(new Name('testing'))

  const useCase = new DockShipUseCase(journal)
  const id = new Id('abc')
  const port = new Port(new PortName('Tennessee'), new Country('US'))
  await expect(useCase.dock(id, port)).rejects.toThrow(new ShipNotFound(id.value))
})
