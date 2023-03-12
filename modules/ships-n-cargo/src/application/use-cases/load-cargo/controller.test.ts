import { expect, jest, test } from '@jest/globals'
import { LoadCargoUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name, NameNotAllowed } from '../../../shared/domain/name'
import { LoadCargoController } from './controller'
import { IdNotAllowed } from '../../../shared/domain/id'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { InvalidDate } from '../../../shared/domain/date'
import { CreateShipUseCase } from '../create-ship/use-case'
import { CreateShipController } from '../create-ship/controller'
import { Response } from '../response'
import { ApplicationError } from '../../../shared/error'

test('construct class object', () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new LoadCargoController(useCase)).toBeTruthy()
})

test('empty id', async () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadCargoController(useCase)

  const request = { id: '', cargoName: 'Enterprise Architecture' }
  const response = await controller.loadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
})

test('invalid id', async () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadCargoController(useCase)

  const request = { id: 'a!c', cargoName: 'Enterprise Architecture' }
  const response = await controller.loadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.id).message)
})

test('empty cargo name', async () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadCargoController(useCase)

  const request = { id: 'abc', cargoName: '' }
  const response = await controller.loadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Cargo name').message)
})

test('invalid cargo name', async () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadCargoController(useCase)

  const request = { id: 'abc', cargoName: 'a!b' }
  const response = await controller.loadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NameNotAllowed(request.cargoName, 'Cargo name').message)
})

test('invalid date', async () => {
  const useCase = new LoadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadCargoController(useCase)

  const request = { id: 'abc', cargoName: 'Enterprise Architecture', dateTime: 'not-a-date' }
  const response = await controller.loadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new InvalidDate().message)
})

test('cannot load the same cargo (name as identifier) twice', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const createShipController = new CreateShipController(createShipUseCase)
  const response1 = await createShipController.create({ id: 'abc', name: 'King Roy' })
  expect(response1.status).toEqual(201)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const loadCargoController = new LoadCargoController(loadCargoUseCase)
  const request = { id: 'abc', cargoName: 'Enterprise Architecture' }
  const response2 = await loadCargoController.loadCargo(request)
  expect(response2.status).toEqual(200)

  // load the same cargo twice
  const response3 = await loadCargoController.loadCargo(request)
  expect(response3.status).toEqual(400)
})

test('valid request', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const createShipController = new CreateShipController(createShipUseCase)
  const response1 = await createShipController.create({ id: 'abc', name: 'King Roy' })
  expect(response1.status).toEqual(201)

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const loadCargoController = new LoadCargoController(loadCargoUseCase)
  const request = { id: 'abc', cargoName: 'Enterprise Architecture' }
  const response2 = await loadCargoController.loadCargo(request)
  expect(response2.status).toEqual(200)
})

test('create throws an unexpected application error', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const loadCargoUseCase = new LoadCargoUseCase(journal)
  const loadCargoController = new LoadCargoController(loadCargoUseCase)
  const request = { id: 'abc', cargoName: 'Enterprise Architecture' }
  jest.spyOn(console, 'error').mockImplementation(jest.fn())
  const useCaseMock = jest.spyOn(LoadCargoUseCase.prototype, 'load').mockImplementation(() => {
    throw new Error('Some error that is not an instance of InvalidArgumentError')
  })

  const response: Response = await loadCargoController.loadCargo(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(new ApplicationError().message)
})
