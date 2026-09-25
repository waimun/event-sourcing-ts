import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { Country } from '../../../../domain/country'
import { ShipNotAtPort, VoyageRequiredToDepart } from '../../../../domain/errors/ship'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { Id, IdNotAllowed } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { opaqueApplicationErrorMessage } from './error-response'
import { RegisterShipController } from './register-ship'
import { SailShipController } from './sail-ship'

afterEach(() => {
  vi.restoreAllMocks()
})

const registerShipAtKingston = async (journal: InMemoryEventJournal) => {
  const response = await new RegisterShipController(new RegisterShipUseCase(journal)).register({
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  })
  expect(response.status).toEqual(201)
  await new PlanVoyageUseCase(journal).plan(
    new Id('abc'),
    new Port(new PortName('Boston'), new Country('US'))
  )
}

test('construct class object', () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  expect(new SailShipController(useCase)).toBeTruthy()
})

test('departs from its registered port', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  await registerShipAtKingston(journal)

  const departureResponse = await new SailShipController(new SailShipUseCase(journal)).sail({
    id: 'abc'
  })
  expect(departureResponse.status).toEqual(200)
})

test('invalid id', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const response = await new SailShipController(new SailShipUseCase(journal)).sail({ id: 'a!c' })
  expect(response.status).toEqual(400)
  expect(response.error).toEqual(new IdNotAllowed('a!c').message)
})

test('ignores a caller-supplied event time', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  await registerShipAtKingston(journal)

  const response = await new SailShipController(new SailShipUseCase(journal)).sail({
    id: 'abc',
    dateTime: 'not-a-date'
  } as never)
  expect(response.status).toEqual(200)
})

test('hides an unexpected request parsing error', async () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new SailShipController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  const response = await controller.sail(null as never)

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
})

test('ship does not exist', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))

  const useCase = new SailShipUseCase(journal)
  const controller = new SailShipController(useCase)
  const response = await controller.sail({ id: 'abc' })
  expect(response.status).toEqual(404)
  expect(response.error).toEqual(new ShipNotFound('abc').message)
})

test('cannot depart without planning a voyage', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  await new RegisterShipController(new RegisterShipUseCase(journal)).register({
    id: 'abc',
    name: 'King Roy',
    port: { name: 'Kingston', country: 'US' }
  })

  expect(
    await new SailShipController(new SailShipUseCase(journal)).sail({ id: 'abc' })
  ).toMatchObject({ status: 409, error: new VoyageRequiredToDepart().message })
})

test('cannot depart twice without arriving', async () => {
  const journal = new InMemoryEventJournal(new Name('test-journal'))
  await registerShipAtKingston(journal)

  const departureController = new SailShipController(new SailShipUseCase(journal))
  const initialDepartureResponse = await departureController.sail({ id: 'abc' })
  expect(initialDepartureResponse.status).toEqual(200)

  const repeatedDepartureResponse = await departureController.sail({ id: 'abc' })
  expect(repeatedDepartureResponse.status).toEqual(409)
  expect(repeatedDepartureResponse.error).toEqual(new ShipNotAtPort().message)
})

test('hides an unexpected application result', async () => {
  const useCase = new SailShipUseCase(new InMemoryEventJournal(new Name('test-journal')))
  const controller = new SailShipController(useCase)
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'sail').mockResolvedValue({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const response = await controller.sail({ id: 'abc' })

  expect(response).toMatchObject({ status: 500, error: opaqueApplicationErrorMessage })
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
