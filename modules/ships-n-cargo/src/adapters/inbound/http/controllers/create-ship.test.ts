import { afterEach, expect, test, vi } from 'vitest'
import { IdAlreadyExists } from '../../../../application/errors/id-already-exists'
import type { EventJournal } from '../../../../application/ports/event-journal'
import type { CreateShipDto } from '../../../../application/use-cases/create-ship/create-ship-dto'
import { CreateShipUseCase } from '../../../../application/use-cases/create-ship/use-case'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { EventJournalUnavailable } from '../../../../shared/error'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { CreateShipController } from './create-ship'
import { opaqueApplicationErrorMessage } from './error-response'
import type { Response } from './response'

afterEach(() => {
  vi.restoreAllMocks()
})

test('construct class object', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new CreateShipController(useCase)).toBeTruthy()
})

test('create with valid request', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: 'testing' }
  const response: Response = await controller.create(request)

  expect(response.status).toEqual(201)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toBeUndefined()
})

test('create with an id that already exists', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const controller = new CreateShipController(new CreateShipUseCase(journal))
  const request: CreateShipDto = { id: 'abc', name: 'testing' }

  expect((await controller.create(request)).status).toEqual(201)

  const response = await controller.create(request)
  expect(response.status).toEqual(409)
  expect(response.error).toEqual(new IdAlreadyExists(request.id).message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an empty id', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: '', name: 'testing' }
  const response: Response = await controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an id that contains whitespaces', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: '   ', name: 'testing' }
  const response: Response = await controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an invalid id', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'a!', name: 'testing' }
  const response: Response = await controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.id).message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an empty name', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: '' }
  const response: Response = await controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Name').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with a name that contains whitespaces', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: '   ' }
  const response: Response = await controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Name').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an invalid name', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: 'a!' }
  const response: Response = await controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NameNotAllowed(request.name).message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create throws an unexpected application error', async () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: 'testing' }
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const useCaseMock = vi.spyOn(CreateShipUseCase.prototype, 'create').mockImplementation(() => {
    throw new Error('unexpected failure')
  })

  const response: Response = await controller.create(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(opaqueApplicationErrorMessage)
})

test('hides an event journal infrastructure failure', async () => {
  const request: CreateShipDto = { id: 'abc', name: 'testing' }
  const cause = new Error('database detail')
  const failure = new EventJournalUnavailable('eventsByAggregate', cause)
  const journal: EventJournal<string, DomainEvent> = {
    append: vi.fn(),
    eventsByAggregate: vi.fn().mockRejectedValue(failure)
  }
  const controller = new CreateShipController(new CreateShipUseCase(journal))
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  const response = await controller.create(request)

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
  expect(response.error).not.toContain(cause.message)
})
