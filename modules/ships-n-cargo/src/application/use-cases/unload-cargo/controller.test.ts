import { expect, jest, test } from '@jest/globals'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { Name, NameNotAllowed } from '../../../shared/domain/name'
import { UnloadCargoUseCase } from './use-case'
import { UnloadCargoController } from './controller'
import { IsRequired } from '../../../shared/domain/errors/is-required'
import { LoadCargoUseCase } from '../load-cargo/use-case'
import { LoadCargoController } from '../load-cargo/controller'
import { IdNotAllowed } from '../../../shared/domain/id'
import { InvalidDate } from '../../../shared/domain/date'
import { CargoNotFound } from '../../../domain/errors/ship'
import { CreateShipUseCase } from '../create-ship/use-case'
import { CreateShipController } from '../create-ship/controller'
import { Response } from '../response'
import { ApplicationError } from '../../../shared/error'

test('construct class object', () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new UnloadCargoController(useCase)).toBeTruthy()
})

test('empty id', async () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadCargoController(useCase)

  const request = { id: '', cargoName: 'Enterprise Architecture' }
  const response = await controller.unloadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
})

test('invalid id', async () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadCargoController(useCase)

  const request = { id: 'a!c', cargoName: 'Enterprise Architecture' }
  const response = await controller.unloadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.id).message)
})

test('empty cargo name', async () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadCargoController(useCase)

  const request = { id: 'abc', cargoName: '' }
  const response = await controller.unloadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Cargo name').message)
})

test('invalid cargo name', async () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadCargoController(useCase)

  const request = { id: 'abc', cargoName: 'a!b' }
  const response = await controller.unloadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NameNotAllowed(request.cargoName, 'Cargo name').message)
})

test('invalid date', async () => {
  const useCase = new UnloadCargoUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadCargoController(useCase)

  const request = { id: 'abc', cargoName: 'Enterprise Architecture', dateTime: 'not-a-date' }
  const response = await controller.unloadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new InvalidDate().message)
})

test('cannot find cargo to unload', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const createShipUseCase = new CreateShipUseCase(journal)
  const createShipController = new CreateShipController(createShipUseCase)
  const response1 = await createShipController.create({ id: 'abc', name: 'King Roy' })
  expect(response1.status).toEqual(201)

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  const unloadCargoController = new UnloadCargoController(unloadCargoUseCase)

  const request = { id: 'abc', cargoName: 'Enterprise Architecture' }
  const response = await unloadCargoController.unloadCargo(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new CargoNotFound(request.cargoName).message)
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

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  const unloadCargoController = new UnloadCargoController(unloadCargoUseCase)
  const response3 = await unloadCargoController.unloadCargo(request)
  expect(response3.status).toEqual(200)
})

test('create throws an unexpected application error', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const unloadCargoUseCase = new UnloadCargoUseCase(journal)
  const unloadCargoController = new UnloadCargoController(unloadCargoUseCase)
  const request = { id: 'abc', cargoName: 'Enterprise Architecture' }
  jest.spyOn(console, 'error').mockImplementation(jest.fn())
  const useCaseMock = jest.spyOn(UnloadCargoUseCase.prototype, 'unload').mockImplementation(() => {
    throw new Error('Some error that is not an instance of InvalidArgumentError')
  })

  const response: Response = await unloadCargoController.unloadCargo(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(new ApplicationError().message)
})
