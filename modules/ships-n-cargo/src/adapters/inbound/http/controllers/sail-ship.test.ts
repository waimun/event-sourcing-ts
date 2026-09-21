import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import type { CreateShipDto } from '../../../../application/use-cases/create-ship/create-ship-dto'
import { CreateShipUseCase } from '../../../../application/use-cases/create-ship/use-case'
import { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { InvalidPortForDeparture } from '../../../../domain/errors/ship'
import { InvalidDate } from '../../../../shared/domain/date'
import { IdNotAllowed } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { CreateShipController } from './create-ship'
import { DockShipController } from './dock-ship'
import { opaqueApplicationErrorMessage } from './error-response'
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

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = await controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const response2 = await controller2.dock({
    id: 'abc',
    port: { name: 'Henderson', country: 'US' }
  })
  expect(response2.status).toEqual(200)

  const useCase3 = new SailShipUseCase(journal)
  const controller3 = new SailShipController(useCase3)
  const response3 = await controller3.sail({ id: 'abc' })
  expect(response3.status).toEqual(200)
})

test('invalid id', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = await controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const response2 = await controller2.dock({
    id: 'abc',
    port: { name: 'Henderson', country: 'US' }
  })
  expect(response2.status).toEqual(200)

  const useCase3 = new SailShipUseCase(journal)
  const controller3 = new SailShipController(useCase3)
  const response3 = await controller3.sail({ id: 'a!c' })
  expect(response3.status).toEqual(400)
  expect(response3.error).toEqual(new IdNotAllowed('a!c').message)
})

test('invalid date', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = await controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const response2 = await controller2.dock({
    id: 'abc',
    port: { name: 'Henderson', country: 'US' }
  })
  expect(response2.status).toEqual(200)

  const useCase3 = new SailShipUseCase(journal)
  const controller3 = new SailShipController(useCase3)
  const response3 = await controller3.sail({ id: 'abc', dateTime: 'not-a-date' })
  expect(response3.status).toEqual(400)
  expect(response3.error).toEqual(new InvalidDate().message)
})

test('ship does not exist', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase = new SailShipUseCase(journal)
  const controller = new SailShipController(useCase)
  const response = await controller.sail({ id: 'abc' })
  expect(response.status).toEqual(404)
  expect(response.error).toEqual(new ShipNotFound('abc').message)
})

test('cannot depart from a missing port', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = await controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new SailShipUseCase(journal)
  const controller2 = new SailShipController(useCase2)
  const response2 = await controller2.sail({ id: 'abc' })
  expect(response2.status).toEqual(409)
  expect(response2.error).toEqual(new InvalidPortForDeparture().message)
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
