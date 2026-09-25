import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { Country } from '../../../../domain/country'
import { InvalidCountry } from '../../../../domain/errors/dock-ship'
import { VoyageAlreadyPlanned, VoyageDestinationSameAsOrigin } from '../../../../domain/errors/ship'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id, IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { opaqueApplicationErrorMessage } from './error-response'
import { PlanVoyageController } from './plan-voyage'

afterEach(() => vi.restoreAllMocks())

const makeController = (journal = new InMemoryEventJournal(new Name('testing'))) => {
  const useCase = new PlanVoyageUseCase(journal)
  return { controller: new PlanVoyageController(useCase), journal, useCase }
}

test('plans a voyage using a validated destination', async () => {
  const { controller, journal } = makeController()
  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    new Id('abc'),
    new Port(new PortName('Kingston'), new Country('US'))
  )

  await expect(
    controller.plan({ id: 'abc', destination: { name: ' Boston ', country: 'us' } })
  ).resolves.toMatchObject({ status: 200 })
})

test.each([
  {
    request: { id: '', destination: { name: 'Boston', country: 'US' } },
    error: new IsRequired('Id')
  },
  {
    request: { id: 'a!b', destination: { name: 'Boston', country: 'US' } },
    error: new IdNotAllowed('a!b')
  },
  { request: { id: 'abc' }, error: new IsRequired('Destination') },
  { request: { id: 'abc', destination: null }, error: new IsRequired('Destination') },
  { request: { id: 'abc', destination: [] }, error: new IsRequired('Destination') },
  {
    request: { id: 'abc', destination: { name: '', country: 'US' } },
    error: new IsRequired('Port name')
  },
  {
    request: { id: 'abc', destination: { name: 'a!', country: 'US' } },
    error: new NameNotAllowed('a!', 'Port name')
  },
  {
    request: { id: 'abc', destination: { name: 'Boston', country: '' } },
    error: new IsRequired('Country')
  },
  {
    request: { id: 'abc', destination: { name: 'Boston', country: 'ZZ' } },
    error: new InvalidCountry('ZZ')
  }
])('rejects an invalid request with $error.code', async ({ request, error }) => {
  const { controller } = makeController()

  expect(await controller.plan(request as never)).toMatchObject({
    status: 400,
    error: error.message
  })
})

test('reports missing ships and voyage conflicts', async () => {
  const { controller, journal } = makeController()
  expect(
    await controller.plan({ id: 'abc', destination: { name: 'Boston', country: 'US' } })
  ).toMatchObject({ status: 404, error: new ShipNotFound('abc').message })

  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    new Id('abc'),
    new Port(new PortName('Kingston'), new Country('US'))
  )
  expect(
    await controller.plan({ id: 'abc', destination: { name: 'Kingston', country: 'US' } })
  ).toMatchObject({ status: 409, error: new VoyageDestinationSameAsOrigin().message })

  await controller.plan({ id: 'abc', destination: { name: 'Boston', country: 'US' } })
  expect(
    await controller.plan({ id: 'abc', destination: { name: 'Belmont', country: 'CA' } })
  ).toMatchObject({ status: 409, error: new VoyageAlreadyPlanned().message })
})

test('hides unexpected application results and failures', async () => {
  const { controller, useCase } = makeController()
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'plan').mockResolvedValueOnce({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const request = { id: 'abc', destination: { name: 'Boston', country: 'US' } }
  expect(await controller.plan(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })

  vi.spyOn(useCase, 'plan').mockRejectedValueOnce(new Error('unexpected failure'))
  expect(await controller.plan(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
})

test('hides unexpected request parsing failures', async () => {
  const { controller } = makeController()
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  expect(await controller.plan(null as never)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
})
