import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import type { RegisterShipDto } from '../../../../application/use-cases/register-ship/register-ship-dto'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { ShipNotAtPort } from '../../../../domain/errors/ship'
import { InvalidDate } from '../../../../shared/domain/date'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { opaqueApplicationErrorMessage } from './error-response'
import { RegisterShipController } from './register-ship'
import { SailShipController } from './sail-ship'

afterEach(() => {
  vi.restoreAllMocks()
})

test('construct class object', () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new SailShipController(useCase)).toBeTruthy()
})

test('sail with valid request', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new RegisterShipUseCase(journal)
  const controller1 = new RegisterShipController(useCase1)
  const request1: RegisterShipDto = {
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  }
  const response1 = await controller1.register(request1)
  expect(response1.status).toEqual(201)
  const controller2 = new SailShipController(new SailShipUseCase(journal))
  expect((await controller2.sail({ id: 'abc' })).status).toEqual(200)
})

test('invalid id', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new RegisterShipUseCase(journal)
  const controller1 = new RegisterShipController(useCase1)
  const request1: RegisterShipDto = {
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  }
  const response1 = await controller1.register(request1)
  expect(response1.status).toEqual(201)
  const controller3 = new SailShipController(new SailShipUseCase(journal))
  const response3 = await controller3.sail({ id: 'a!c' })
  expect(response3.status).toEqual(400)
  expect(response3.error).toEqual(new IdNotAllowed('a!c').message)
})

test('invalid date', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new RegisterShipUseCase(journal)
  const controller1 = new RegisterShipController(useCase1)
  const request1: RegisterShipDto = {
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  }
  const response1 = await controller1.register(request1)
  expect(response1.status).toEqual(201)
  const controller3 = new SailShipController(new SailShipUseCase(journal))
  const response3 = await controller3.sail({ id: 'abc', dateTime: 'not-a-date' })
  expect(response3.status).toEqual(400)
  expect(response3.error).toEqual(new InvalidDate().message)
})

test('hides an unexpected request parsing error', async () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new SailShipController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  const response = await controller.sail(null as never)

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('ship does not exist', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase = new SailShipUseCase(journal)
  const controller = new SailShipController(useCase)
  const response = await controller.sail({ id: 'abc' })
  expect(response.status).toEqual(404)
  expect(response.error).toEqual(new ShipNotFound('abc').message)
})

test('cannot depart twice without arriving', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new RegisterShipUseCase(journal)
  const controller1 = new RegisterShipController(useCase1)
  const request1: RegisterShipDto = {
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  }
  const response1 = await controller1.register(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new SailShipUseCase(journal)
  const controller2 = new SailShipController(useCase2)
  expect((await controller2.sail({ id: 'abc' })).status).toEqual(200)
  const response2 = await controller2.sail({ id: 'abc' })
  expect(response2.status).toEqual(409)
  expect(response2.error).toEqual(new ShipNotAtPort().message)
})

test('hides an unexpected application result', async () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new SailShipController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'sail').mockResolvedValue({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const response = await controller.sail({ id: 'abc' })

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('throws an unexpected application error', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new SailShipUseCase(journal)
  const controller = new SailShipController(useCase)
  const request = { id: 'xyz' }

  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const useCaseMock = vi.spyOn(SailShipUseCase.prototype, 'sail').mockImplementation(() => {
    throw new Error('unexpected failure')
  })

  const response = await controller.sail(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(opaqueApplicationErrorMessage)
})
