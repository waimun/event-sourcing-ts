import { afterEach, expect, test, vi } from 'vitest'
import { LoadContainerUseCase } from '../../../../application/use-cases/load-container/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { ShipNotAtPort } from '../../../../domain/errors/ship'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id, IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { opaqueApplicationErrorMessage } from './error-response'
import { LoadContainerController } from './load-container'
import { RegisterShipController } from './register-ship'
import type { Response } from './response'

afterEach(() => {
  vi.restoreAllMocks()
})

test('construct class object', () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new LoadContainerController(useCase)).toBeTruthy()
})

test('empty id', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: '',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
})

test('invalid id', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: 'a!c',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.id).message)
})

test('empty container id', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: 'abc',
    containerId: '',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Container ID').message)
})

test('invalid container id', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: 'abc',
    containerId: 'a!b',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.containerId, 'Container ID').message)
})

test('empty cargo reference', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: 'abc',
    containerId: 'container-1',
    cargoReference: '',
    description: 'Enterprise Architecture'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Cargo reference').message)
})

test('invalid cargo reference', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: 'abc',
    containerId: 'container-1',
    cargoReference: 'cargo/reference',
    description: 'Enterprise Architecture'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(
    new IdNotAllowed(request.cargoReference, 'Cargo reference').message
  )
})

test('invalid container description', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: 'abc',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'a!b'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(
    new NameNotAllowed(request.description, 'Container description').message
  )
})

test('ignores a caller-supplied event time', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)

  const request = {
    id: 'abc',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture',
    dateTime: 'not-a-date'
  }
  const response = await controller.loadContainer(request)
  expect(response.status).toEqual(404)
})

test('cannot load the same container identity twice', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const registerShipUseCase = new RegisterShipUseCase(journal)
  const registerShipController = new RegisterShipController(registerShipUseCase)
  const registrationResponse = await registerShipController.register({
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  })
  expect(registrationResponse.status).toEqual(201)

  const loadContainerUseCase = new LoadContainerUseCase(journal)
  const loadContainerController = new LoadContainerController(loadContainerUseCase)
  const request = {
    id: 'abc',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  }
  const initialLoadResponse = await loadContainerController.loadContainer(request)
  expect(initialLoadResponse.status).toEqual(200)

  const repeatedLoadResponse = await loadContainerController.loadContainer(request)
  expect(repeatedLoadResponse.status).toEqual(409)
})

test('loads a container onto a ship at port', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const registerShipUseCase = new RegisterShipUseCase(journal)
  const registerShipController = new RegisterShipController(registerShipUseCase)
  const registrationResponse = await registerShipController.register({
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  })
  expect(registrationResponse.status).toEqual(201)

  const loadContainerUseCase = new LoadContainerUseCase(journal)
  const loadContainerController = new LoadContainerController(loadContainerUseCase)
  const request = {
    id: 'abc',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  }
  const loadResponse = await loadContainerController.loadContainer(request)
  expect(loadResponse.status).toEqual(200)
})

test('cannot load a container while the ship is at sea', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const id = new Id('abc')
  const registerController = new RegisterShipController(new RegisterShipUseCase(journal))
  await registerController.register({
    id: id.value,
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  })
  await new SailShipUseCase(journal).sail(id)

  const response = await new LoadContainerController(
    new LoadContainerUseCase(journal)
  ).loadContainer({
    id: id.value,
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  })

  expect(response).toMatchObject({
    status: 409,
    error: new ShipNotAtPort('load a container').message
  })
})

test('hides an unexpected application result', async () => {
  const useCase = new LoadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new LoadContainerController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'load').mockResolvedValue({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const response = await controller.loadContainer({
    id: 'abc',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  })

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('create throws an unexpected application error', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const loadContainerUseCase = new LoadContainerUseCase(journal)
  const loadContainerController = new LoadContainerController(loadContainerUseCase)
  const request = {
    id: 'abc',
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  }
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const useCaseMock = vi.spyOn(LoadContainerUseCase.prototype, 'load').mockImplementation(() => {
    throw new Error('unexpected failure')
  })

  const response: Response = await loadContainerController.loadContainer(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(opaqueApplicationErrorMessage)
})
