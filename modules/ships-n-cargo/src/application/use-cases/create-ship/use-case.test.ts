import { afterEach, expect, test, vi } from 'vitest'
import { InMemoryEventJournal } from '../../../adapters/outbound/persistence/in-memory-event-journal'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { IdAlreadyExists } from '../../errors/id-already-exists'
import { JournalVersionConflict } from '../../errors/journal-version-conflict'
import type { EventJournal } from '../../ports/event-journal'
import { CreateShipUseCase } from './use-case'

afterEach(() => {
  vi.restoreAllMocks()
})

test('construct class object', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('create ship request', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)
  const result = await useCase.create(name, id)
  expect(result).toEqual({ ok: true, value: undefined })
  const events = (await journal.eventsByAggregate(id.value)).events
  expect(events.length).toEqual(1)
})

test('create with an id that already exists in the journal', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)
  await useCase.create(name, id)
  const events = (await journal.eventsByAggregate(id.value)).events
  expect(events.length).toEqual(1)

  // create with duplicated id
  expect(await useCase.create(name, id)).toMatchObject({
    ok: false,
    error: new IdAlreadyExists(id.value)
  })
})

test('rechecks existence after a concurrent create wins', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal = new InMemoryEventJournal(name)
  const append = journal.append.bind(journal)
  vi.spyOn(journal, 'append').mockImplementationOnce(async (aggregateId, version, events) => {
    await append(aggregateId, version, events)
    throw new JournalVersionConflict(aggregateId, version, version + events.length)
  })

  expect(await new CreateShipUseCase(journal).create(name, id)).toMatchObject({
    ok: false,
    error: new IdAlreadyExists(id.value)
  })
  expect((await journal.eventsByAggregate(id.value)).events).toHaveLength(1)
})

test('throws an unknown error', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)

  const eventJournalMock = vi
    .spyOn(InMemoryEventJournal.prototype, 'append')
    .mockImplementation(() => {
      throw new Error('Some error that is not an instance of EntryAlreadyExists')
    })

  await expect(useCase.create(name, id)).rejects.toThrow(Error)
  expect(eventJournalMock).toHaveBeenCalled()
})
