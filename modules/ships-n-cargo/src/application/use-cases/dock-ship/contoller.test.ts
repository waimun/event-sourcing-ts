import { expect, jest, test } from '@jest/globals'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { DockShipUseCase } from './use-case'
import { DockShipController } from './controller'
import { CreateShipUseCase } from '../create-ship/use-case'
import { CreateShipController } from '../create-ship/controller'
import { CreateShipDto } from '../create-ship/create-ship-dto'
import { ShipNotFound } from './error'
import { ApplicationError } from '../../../shared/error'
import { InvalidCountry, NoCountrySpecifiedForPort } from '../../../domain/errors/dock-ship'
import { Name } from '../../../shared/domain/name'
import { IsRequired } from '../../../shared/domain/errors/is-required'

test('construct class object', () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new DockShipController(useCase)).toBeTruthy()
})

test('dock with valid request', () => {
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
})

test('port is undefined', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz' }

  // @ts-expect-error
  const response = controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port').message)
})

test('port is null', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: null }

  // @ts-expect-error
  const response = controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port').message)
})

test('port is an array', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: [] }

  // @ts-expect-error
  const response = controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port').message)
})

test('dock with a port that does not have a country', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: 'Henderson', country: 'NO_COUNTRY' } }

  const response = controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NoCountrySpecifiedForPort().message)
})

test('dock with a port that has an invalid country', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: 'Henderson', country: 'ZZ' } }

  const response = controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new InvalidCountry(request.port.country).message)
})

test('invalid name for port', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: '', country: 'CA' } }

  const response = controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port name').message)
})

test('ship does not exist to dock', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new CreateShipUseCase(journal)
  const controller1 = new CreateShipController(useCase1)
  const request1: CreateShipDto = { id: 'abc', name: 'Queen Mary' }
  const response1 = controller1.create(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const request2 = { id: 'xyz', port: { name: 'Henderson', country: 'US' } }
  const response2 = controller2.dock(request2)

  expect(response2.status).toEqual(400)
  expect(response2.error).toEqual(new ShipNotFound(request2.id).message)
})

test('throws an unexpected application error', () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: 'Henderson', country: 'US' } }

  jest.spyOn(console, 'error').mockImplementation(jest.fn())
  const useCaseMock = jest.spyOn(DockShipUseCase.prototype, 'dock').mockImplementation(() => {
    throw new Error('Some error that is not an instance of InvalidArgumentError')
  })

  const response = controller.dock(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(new ApplicationError().message)
})
