import { expect, test, jest } from '@jest/globals'
import { CreateShipUseCase } from './use-case'
import { InMemoryEventJournal } from '../../../infrastructure/persistence/in-memory-event-journal'
import { CreateShipController } from './controller'
import { IdIsRequired, IdNotAllowed } from '../../../shared/validators/id'
import { NameIsRequired, NameNotAllowed } from '../../../shared/validators/name'
import { ApplicationError } from '../../../shared/error'
import { Response } from '../response'
import { CreateShipDto } from './create-ship-dto'

test('construct class object', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  expect(new CreateShipController(useCase)).toBeTruthy()
})

test('create with valid request', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: 'testing' }
  const response: Response = controller.create(request)

  expect(response.status).toEqual(201)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toBeUndefined()
})

test('create with an empty id', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: '', name: 'testing' }
  const response: Response = controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdIsRequired().message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an id that contains whitespaces', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: '   ', name: 'testing' }
  const response: Response = controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdIsRequired().message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an invalid id', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'a!', name: 'testing' }
  const response: Response = controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed().message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an empty name', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: '' }
  const response: Response = controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NameIsRequired().message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with a name that contains whitespaces', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: '   ' }
  const response: Response = controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NameIsRequired().message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create with an invalid name', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: 'a!' }
  const response: Response = controller.create(request)

  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new NameNotAllowed().message)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
})

test('create throws an unexpected application error', () => {
  const useCase = new CreateShipUseCase(new InMemoryEventJournal('test-journal'))
  const controller = new CreateShipController(useCase)
  const request: CreateShipDto = { id: 'abc', name: 'testing' }
  jest.spyOn(console, 'error').mockImplementation(jest.fn())
  const createMock = jest.spyOn(CreateShipUseCase.prototype, 'create').mockImplementation(() => {
    throw new Error('Some error that is not an instance of InvalidArgumentError')
  })

  const response: Response = controller.create(request)

  expect(createMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(new ApplicationError().message)
})
