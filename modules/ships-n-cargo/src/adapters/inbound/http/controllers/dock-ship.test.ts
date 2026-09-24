import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import type { RegisterShipDto } from '../../../../application/use-cases/register-ship/register-ship-dto'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { Country } from '../../../../domain/country'
import { InvalidCountry } from '../../../../domain/errors/dock-ship'
import { ShipNotAtSea } from '../../../../domain/errors/ship'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { DockShipController } from './dock-ship'
import { opaqueApplicationErrorMessage } from './error-response'
import { RegisterShipController } from './register-ship'

afterEach(() => {
  vi.restoreAllMocks()
})

test('construct class object', () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new DockShipController(useCase)).toBeTruthy()
})

test('dock with valid request', async () => {
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
  await new SailShipUseCase(journal).sail(new Id('abc'))

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const response2 = await controller2.dock({
    id: 'abc',
    port: { name: 'Henderson', country: 'US' }
  })
  expect(response2.status).toEqual(200)
})

test('port is undefined', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz' }

  // @ts-expect-error
  const response = await controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port').message)
})

test('port is null', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: null }

  // @ts-expect-error
  const response = await controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port').message)
})

test('port is an array', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: [] }

  // @ts-expect-error
  const response = await controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port').message)
})

test('dock rejects the removed no-country sentinel', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: 'Henderson', country: 'NO_COUNTRY' } }

  const response = await controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new InvalidCountry(request.port.country).message)
})

test('dock with a port that has an invalid country', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: 'Henderson', country: 'ZZ' } }

  const response = await controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new InvalidCountry(request.port.country).message)
})

test('invalid name for port', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: '', country: 'CA' } }

  const response = await controller.dock(request)
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IsRequired('Port name').message)
})

test('ship does not exist to dock', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase1 = new RegisterShipUseCase(journal)
  const controller1 = new RegisterShipController(useCase1)
  const request1: RegisterShipDto = {
    id: 'abc',
    name: 'Queen Mary',
    port: { name: 'Kingston', country: 'US' }
  }
  const response1 = await controller1.register(request1)
  expect(response1.status).toEqual(201)

  const useCase2 = new DockShipUseCase(journal)
  const controller2 = new DockShipController(useCase2)
  const request2 = { id: 'xyz', port: { name: 'Henderson', country: 'US' } }
  const response2 = await controller2.dock(request2)

  expect(response2.status).toEqual(404)
  expect(response2.error).toEqual(new ShipNotFound(request2.id).message)
})

test('cannot dock while already at a port', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  await new RegisterShipUseCase(journal).register(
    new Name('King Roy'),
    new Id('abc'),
    new Port(new PortName('Kingston'), new Country('US'))
  )

  const response = await new DockShipController(new DockShipUseCase(journal)).dock({
    id: 'abc',
    port: { name: 'Boston', country: 'US' }
  })
  expect(response.status).toBe(409)
  expect(response.error).toBe(new ShipNotAtSea().message)
})

test('throws an unexpected application error', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const useCase = new DockShipUseCase(journal)
  const controller = new DockShipController(useCase)
  const request = { id: 'xyz', port: { name: 'Henderson', country: 'US' } }

  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const useCaseMock = vi.spyOn(DockShipUseCase.prototype, 'dock').mockImplementation(() => {
    throw new Error('unexpected failure')
  })

  const response = await controller.dock(request)

  expect(useCaseMock).toHaveBeenCalled()
  expect(response.status).toEqual(500)
  expect(response.dateTime).toBeTruthy()
  expect(response.body).toBeUndefined()
  expect(response.error).toEqual(opaqueApplicationErrorMessage)
})
