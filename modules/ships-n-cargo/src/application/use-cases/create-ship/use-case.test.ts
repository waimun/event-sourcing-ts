import { expect, test } from '@jest/globals'
import { CreateShipRequest, CreateShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { NameIsRequired, NameNotAllowed } from '../../../shared/validators/name'
import { EventJournal } from '../../../domain/events/event-journal'
import { DomainEvent } from '../../../domain/events/domain-event'
import { IdIsRequired, IdNotAllowed } from '../../../shared/validators/id'
import { IdAlreadyExists } from './error'

test('construct class object', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(useCase).toBeTruthy()
})

test('create journal with empty name', () => {
  expect(() => new CreateShipUseCase(new InMemoryEventJournal(''))).toThrow(NameNotAllowed)
})

test('create journal with three white spaces', () => {
  expect(() => new CreateShipUseCase(new InMemoryEventJournal('   '))).toThrow(NameNotAllowed)
})

test('create ship request', () => {
  const request: CreateShipRequest = { id: 'abc', name: 'testing' }
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal('testing')
  const useCase = new CreateShipUseCase(journal)
  useCase.create(request)
  expect(journal.eventsById('abc').length).toEqual(1)
})

test('create ship request with empty id', () => {
  const request: CreateShipRequest = { id: '', name: 'testing' }
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(() => useCase.create(request)).toThrow(IdIsRequired)
})

test('create ship request with whitespaces for id', () => {
  const request: CreateShipRequest = { id: '   ', name: 'testing' }
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(() => useCase.create(request)).toThrow(IdIsRequired)
})

test('create ship request with invalid id', () => {
  const request: CreateShipRequest = { id: 'a!', name: 'testing' }
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(() => useCase.create(request)).toThrow(IdNotAllowed)
})

test('create ship request with empty name', () => {
  const request: CreateShipRequest = { id: 'a', name: '' }
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(() => useCase.create(request)).toThrow(NameIsRequired)
})

test('create ship request with whitespaces for name', () => {
  const request: CreateShipRequest = { id: 'a', name: '   ' }
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(() => useCase.create(request)).toThrow(NameIsRequired)
})

test('create ship request with invalid name', () => {
  const request: CreateShipRequest = { id: 'a', name: 'abc!' }
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(() => useCase.create(request)).toThrow(NameNotAllowed)
})

test('create with an id that already exists in the journal', () => {
  const request: CreateShipRequest = { id: 'abc', name: 'testing' }
  const journal: EventJournal<string, DomainEvent> = new InMemoryEventJournal('testing')
  const useCase = new CreateShipUseCase(journal)
  useCase.create(request)
  expect(journal.eventsById('abc').length).toEqual(1)

  // create with duplicated id
  expect(() => useCase.create(request)).toThrow(new IdAlreadyExists(request.id))
})
