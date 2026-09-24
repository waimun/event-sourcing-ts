import { afterEach, expect, test, vi } from 'vitest'
import { IdAlreadyExists } from '../../../../application/errors/id-already-exists'
import type { EventJournal } from '../../../../application/ports/event-journal'
import type { RegisterShipDto } from '../../../../application/use-cases/register-ship/register-ship-dto'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { InvalidCountry } from '../../../../domain/errors/dock-ship'
import type { DomainEvent } from '../../../../domain/events/domain-event'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { EventJournalUnavailable } from '../../../../shared/error'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { opaqueApplicationErrorMessage } from './error-response'
import { RegisterShipController } from './register-ship'
import type { Response } from './response'

afterEach(() => {
  vi.restoreAllMocks()
})

const port = { name: 'Kingston', country: 'US' }

test('construct class object', () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new RegisterShipController(useCase)).toBeTruthy()
})

test('register with valid request', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: 'abc', name: 'testing', port }
  const response: Response = await controller.register(request)

  expect(response.status).toEqual(201)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toBeUndefined()
})

test('register with an id that already exists', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const controller = new RegisterShipController(new RegisterShipUseCase(journal))
  const request: RegisterShipDto = { id: 'abc', name: 'testing', port }

  expect((await controller.register(request)).status).toEqual(201)

  const response = await controller.register(request)
  expect(response.status).toEqual(409)
  expect(response.error).toEqual(new IdAlreadyExists(request.id).message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('register with an empty id', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: '', name: 'testing', port }
  const response: Response = await controller.register(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('register with an id that contains whitespaces', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: '   ', name: 'testing', port }
  const response: Response = await controller.register(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('register with an invalid id', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: 'a!', name: 'testing', port }
  const response: Response = await controller.register(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.id).message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('register with an empty name', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: 'abc', name: '', port }
  const response: Response = await controller.register(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Name').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('register with a name that contains whitespaces', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: 'abc', name: '   ', port }
  const response: Response = await controller.register(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Name').message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('register with an invalid name', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: 'abc', name: 'a!', port }
  const response: Response = await controller.register(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NameNotAllowed(request.name).message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('registration requires a port', async () => {
  const controller = new RegisterShipController(
    new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  )

  const response = await controller.register({ id: 'abc', name: 'testing' } as RegisterShipDto)

  expect(response.status).toBe(400)
  expect(response.error).toBe(new IsRequired('Port').message)
})

test('registration requires a real port name and country', async () => {
  const controller = new RegisterShipController(
    new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  )

  const invalidName = await controller.register({
    id: 'abc',
    name: 'testing',
    port: { name: '!', country: 'US' }
  })
  const invalidCountry = await controller.register({
    id: 'abc',
    name: 'testing',
    port: { name: 'Kingston', country: 'NO_COUNTRY' }
  })

  expect(invalidName.error).toBe(new NameNotAllowed('!', 'Port name').message)
  expect(invalidCountry.error).toBe(new InvalidCountry('NO_COUNTRY').message)
})

test('hides an unexpected request parsing error', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  const response = await controller.register(null as never)

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('hides an unexpected application result', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'register').mockResolvedValue({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const response = await controller.register({ id: 'abc', name: 'testing', port })

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('register throws an unexpected application error', async () => {
  const useCase = new RegisterShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new RegisterShipController(useCase)
  const request: RegisterShipDto = { id: 'abc', name: 'testing', port }
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const useCaseMock = vi.spyOn(RegisterShipUseCase.prototype, 'register').mockImplementation(() => {
    throw new Error('unexpected failure')
  })

  const response: Response = await controller.register(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(opaqueApplicationErrorMessage)
})

test('hides an event journal infrastructure failure', async () => {
  const request: RegisterShipDto = { id: 'abc', name: 'testing', port }
  const cause = new Error('database detail')
  const failure = new EventJournalUnavailable('eventsByAggregate', cause)
  const journal: EventJournal<string, DomainEvent> = {
    append: vi.fn(),
    eventsByAggregate: vi.fn().mockRejectedValue(failure)
  }
  const controller = new RegisterShipController(new RegisterShipUseCase(journal))
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  const response = await controller.register(request)

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
  expect(response.error).not.toContain(cause.message)
})
