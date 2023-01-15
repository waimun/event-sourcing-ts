import { expect, jest, test } from '@jest/globals'
import { SailShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name } from '../../../shared/domain/name'
import { SailShipController } from './controller'
import { CreateShipUseCase } from '../create-ship/use-case'
import { CreateShipController } from '../create-ship/controller'
import { CreateShipDto } from '../create-ship/create-ship-dto'
import { DockShipUseCase } from '../dock-ship/use-case'
import { DockShipController } from '../dock-ship/controller'
import { IdNotAllowed } from '../../../shared/domain/id'
import { InvalidDate } from '../../../shared/domain/date'
import { ShipNotFound } from './error'
import { InvalidPortForDeparture } from '../../../domain/errors/ship'
import { ApplicationError } from '../../../shared/error'

test('construct class object', () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new SailShipController(useCase)).toBeTruthy()
})

test('sail with valid request', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const response2 = controller2.dock({ id: 'abc', port: { name: 'Henderson', country: 'US' } })
  expect(response2.status).toEqual(200)

  const useCase3 = new SailShipUseCase(journal)
  const controller3 = new SailShipController(useCase3)
  const response3 = controller3.sail({ id: 'abc' })
  expect(response3.status).toEqual(200)
})

test('invalid id', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const response2 = controller2.dock({ id: 'abc', port: { name: 'Henderson', country: 'US' } })
  expect(response2.status).toEqual(200)

  const useCase3 = new SailShipUseCase(journal)
  const controller3 = new SailShipController(useCase3)
  const response3 = controller3.sail({ id: 'a!c' })
  expect(response3.status).toEqual(400)
  expect(response3.error).toEqual(new IdNotAllowed('a!c').message)
})

test('invalid date', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const response2 = controller2.dock({ id: 'abc', port: { name: 'Henderson', country: 'US' } })
  expect(response2.status).toEqual(200)

  const useCase3 = new SailShipUseCase(journal)
  const controller3 = new SailShipController(useCase3)
  const response3 = controller3.sail({ id: 'abc', dateTime: 'not-a-date' })
  expect(response3.status).toEqual(400)
  expect(response3.error).toEqual(new InvalidDate().message)
})

test('ship does not exist', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase = new SailShipUseCase(journal)
  const controller = new SailShipController(useCase)
  const response = controller.sail({ id: 'abc' })
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new ShipNotFound('abc').message)
})

test('cannot depart from a missing port', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'King Roy' }
  const response1 = controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new SailShipUseCase(journal)
  const controller2 = new SailShipController(useCase2)
  const response2 = controller2.sail({ id: 'abc' })
  expect(response2.status).toEqual(400)
  expect(response2.error).toEqual(new InvalidPortForDeparture().message)
})

test('throws an unexpected application error', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new SailShipUseCase(journal)
  const controller = new SailShipController(useCase)
  const request = { id: 'xyz' }

  jest.spyOn(console, 'error').mockImplementation(jest.fn())
  const useCaseMock = jest.spyOn(SailShipUseCase.prototype, 'sail').mockImplementation(() => {
    throw new Error('Some error that is not an instance of InvalidArgumentError')
  })

  const response = controller.sail(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(new ApplicationError().message)
})
