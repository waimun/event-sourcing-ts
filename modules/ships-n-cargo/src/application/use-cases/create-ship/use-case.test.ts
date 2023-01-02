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

test('create ship request', () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)
  useCase.create(name, id)
  expect(journal.eventsById(id.value).length).toEqual(1)
})

test('create with an id that already exists in the journal', () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)
  useCase.create(name, id)
  expect(journal.eventsById(id.value).length).toEqual(1)

  // create with duplicated id
  expect(() => useCase.create(name, id)).toThrow(new IdAlreadyExists(id.value))
})

test('throws an unknown error', () => {
  const name = new Name('testing')
  const id = new Id('abc')
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal(name)
  const useCase = new CreateShipUseCase(journal)

  const createMock = jest.spyOn(InMemoryEventJournal.prototype, 'newEntry').mockImplementation(() => {
    throw new Error('Some error that is not an instance of EntryAlreadyExists')
  })

  expect(() => useCase.create(name, id)).toThrow(Error)
  expect(createMock).toHaveBeenCalled()
})
