import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import { Country } from '../../../domain/country'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { IdAlreadyExists } from '../../errors/id-already-exists'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import type { EventJournal } from '../../ports/event-journal'
import { RegisterShipUseCase } from './use-case'

afterEach(() => {
  vi.restoreAllMocks()
})

const initialPort = new Port(new PortName('Kingston'), new Country('US'))

test('construct class object', () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('register ship request', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new RegisterShipUseCase(journal)
  const result = await useCase.register(name, id, initialPort)
  expect(result).toEqual({ ok: true, value: undefined })
  const events = (await journal.eventsByAggregate(id.value)).events
  expect(events.length).toEqual(1)
})

test('register with an id that already exists in the journal', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new RegisterShipUseCase(journal)
  await useCase.register(name, id, initialPort)
  const events = (await journal.eventsByAggregate(id.value)).events
  expect(events.length).toEqual(1)

  expect(await useCase.register(name, id, initialPort)).toMatchObject({
    ok: false,
    error: new IdAlreadyExists(id.value)
  })
})

test('rechecks existence after a concurrent registration wins', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal = new InMemoryEventJournal(name)
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  expect(await new RegisterShipUseCase(journal).register(name, id, initialPort)).toMatchObject({
    ok: false,
    error: new IdAlreadyExists(id.value)
  })
  expect((await journal.eventsByAggregate(id.value)).events).toHaveLength(1)
})

test('throws an unknown error', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new RegisterShipUseCase(journal)

  const eventJournalMock = vi
    .spyOn(InMemoryEventJournal.prototype, 'append')
    .mockImplementation(() => {
      throw new Error('Some error that is not an instance of EntryAlreadyExists')
    })

  await expect(useCase.register(name, id, initialPort)).rejects.toThrow(Error)
  expect(eventJournalMock).toHaveBeenCalled()
})
