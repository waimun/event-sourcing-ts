import { afterEach, expect, test, vi } from 'vitest'
import { LoadContainerUseCase } from '../../../../application/use-cases/load-container/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { UnloadContainerUseCase } from '../../../../application/use-cases/unload-container/use-case'
import { ContainerNotFound, ShipNotAtPort } from '../../../../domain/errors/ship'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id, IdNotAllowed } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { opaqueApplicationErrorMessage } from './error-response'
import { LoadContainerController } from './load-container'
import { RegisterShipController } from './register-ship'
import type { Response } from './response'
import { UnloadContainerController } from './unload-container'

afterEach(() => {
  vi.restoreAllMocks()
})

test('construct class object', () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new UnloadContainerController(useCase)).toBeTruthy()
})

test('empty id', async () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadContainerController(useCase)

  const request = { id: '', containerId: 'container-1' }
  const response = await controller.unloadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Id').message)
})

test('invalid id', async () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadContainerController(useCase)

  const request = { id: 'a!c', containerId: 'container-1' }
  const response = await controller.unloadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.id).message)
})

test('empty container id', async () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadContainerController(useCase)

  const request = { id: 'abc', containerId: '' }
  const response = await controller.unloadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Container ID').message)
})

test('invalid container id', async () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadContainerController(useCase)

  const request = { id: 'abc', containerId: 'a!b' }
  const response = await controller.unloadContainer(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed(request.containerId, 'Container ID').message)
})

test('ignores a caller-supplied event time', async () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadContainerController(useCase)

  const request = { id: 'abc', containerId: 'container-1', dateTime: 'not-a-date' }
  const response = await controller.unloadContainer(request)
  expect(response.status).toEqual(404)
})

test('hides an unexpected request parsing error', async () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadContainerController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  const response = await controller.unloadContainer(null as never)

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('cannot find container to unload', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const registerShipUseCase = new RegisterShipUseCase(journal)
  const registerShipController = new RegisterShipController(registerShipUseCase)
  const registrationResponse = await registerShipController.register({
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  })
  expect(registrationResponse.status).toEqual(201)

  const unloadContainerUseCase = new UnloadContainerUseCase(journal)
  const unloadContainerController = new UnloadContainerController(unloadContainerUseCase)

  const request = { id: 'abc', containerId: 'container-1' }
  const response = await unloadContainerController.unloadContainer(request)
  expect(response.status).toEqual(404)
  expect(response.error).toEqual(new ContainerNotFound(request.containerId).message)
})

test('unloads an onboard container from a ship at port', async () => {
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

  const unloadContainerUseCase = new UnloadContainerUseCase(journal)
  const unloadContainerController = new UnloadContainerController(unloadContainerUseCase)
  const unloadResponse = await unloadContainerController.unloadContainer(request)
  expect(unloadResponse.status).toEqual(200)
})

test('cannot unload a container while the ship is at sea', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const id = new Id('abc')
  const registerController = new RegisterShipController(new RegisterShipUseCase(journal))
  await registerController.register({
    id: id.value,
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  })
  await new LoadContainerController(new LoadContainerUseCase(journal)).loadContainer({
    id: id.value,
    containerId: 'container-1',
    cargoReference: 'cargo-1',
    description: 'Enterprise Architecture'
  })
  await new SailShipUseCase(journal).sail(id)

  const response = await new UnloadContainerController(
    new UnloadContainerUseCase(journal)
  ).unloadContainer({ id: id.value, containerId: 'container-1' })

  expect(response).toMatchObject({
    status: 409,
    error: new ShipNotAtPort('unload a container').message
  })
})

test('hides an unexpected application result', async () => {
  const useCase = new UnloadContainerUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new UnloadContainerController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'unload').mockResolvedValue({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const response = await controller.unloadContainer({
    id: 'abc',
    containerId: 'container-1'
  })

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('create throws an unexpected application error', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const unloadContainerUseCase = new UnloadContainerUseCase(journal)
  const unloadContainerController = new UnloadContainerController(unloadContainerUseCase)
  const request = { id: 'abc', containerId: 'container-1' }
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const useCaseMock = vi
    .spyOn(UnloadContainerUseCase.prototype, 'unload')
    .mockImplementation(() => {
      throw new Error('unexpected failure')
    })

  const response: Response = await unloadContainerController.unloadContainer(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(opaqueApplicationErrorMessage)
})
