import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { DockShipUseCase } from '../../../../application/use-cases/dock-ship/use-case'
import { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import type { RegisterShipDto } from '../../../../application/use-cases/register-ship/register-ship-dto'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { Country } from '../../../../domain/country'
import { InvalidCountry } from '../../../../domain/errors/dock-ship'
import { ShipMustDockAtVoyageDestination, ShipNotAtSea } from '../../../../domain/errors/ship'
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

test('docks at a destination after departing its initial port', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const registrationRequest: RegisterShipDto = {
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  }
  const registrationResponse = await new RegisterShipController(
    new RegisterShipUseCase(journal)
  ).register(registrationRequest)
  expect(registrationResponse.status).toEqual(201)
  await new PlanVoyageUseCase(journal).plan(
    new Id('abc'),
    new Port(new PortName('Henderson'), new Country('US'))
  )
  await new SailShipUseCase(journal).sail(new Id('abc'))

  const arrivalResponse = await new DockShipController(new DockShipUseCase(journal)).dock({
    id: 'abc',
    port: { name: 'Henderson', country: 'US' }
  })
  expect(arrivalResponse.status).toEqual(200)
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
  const requestForMissingShip = {
    id: 'xyz',
    port: { name: 'Henderson', country: 'US' }
  }
  const response = await new DockShipController(new DockShipUseCase(journal)).dock(
    requestForMissingShip
  )

  expect(response.status).toEqual(404)
  expect(response.error).toEqual(new ShipNotFound(requestForMissingShip.id).message)
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

test('cannot dock away from the planned destination', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  const id = new Id('abc')
  const origin = new Port(new PortName('Kingston'), new Country('US'))
  const destination = new Port(new PortName('Boston'), new Country('US'))
  await new RegisterShipUseCase(journal).register(new Name('King Roy'), id, origin)
  await new PlanVoyageUseCase(journal).plan(id, destination)
  await new SailShipUseCase(journal).sail(id)

  const response = await new DockShipController(new DockShipUseCase(journal)).dock({
    id: id.value,
    port: { name: 'Belmont', country: 'CA' }
  })
  expect(response).toMatchObject({
    status: 409,
    error: new ShipMustDockAtVoyageDestination(destination.name, destination.country).message
  })
})

test('hides an unexpected application result', async () => {
  const useCase = new DockShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new DockShipController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'dock').mockResolvedValue({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const response = await controller.dock({
    id: 'abc',
    port: { name: 'Henderson', country: 'US' }
  })

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
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
