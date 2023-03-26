import { expect, jest, test } from '@jest/globals'
import { CreateShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { IdAlreadyExists } from './error'
import { Name } from '../../../shared/domain/name'
import { Id } from '../../../shared/domain/id'

test('construct class object', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(useCase).toBeTruthy()
})

test('create ship request', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)
  await useCase.create(name, id)
  const events = await journal.eventsByAggregate(id.value)
  expect(events.length).toEqual(1)
})

test('create with an id that already exists in the journal', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)
  await useCase.create(name, id)
  const events = await journal.eventsByAggregate(id.value)
  expect(events.length).toEqual(1)

  // create with duplicated id
  await expect(useCase.create(name, id)).rejects.toThrow(new IdAlreadyExists(id.value))
})

test('throws an unknown error', async () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)

  const eventJournalMock = jest.spyOn(InMemoryEventJournal.prototype, 'append').mockImplementation(() => {
    throw new Error('Some error that is not an instance of EntryAlreadyExists')
  })

  await expect(useCase.create(name, id)).rejects.toThrow(Error)
  expect(eventJournalMock).toHaveBeenCalled()
})
