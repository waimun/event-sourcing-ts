import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { ChangeVoyageDestinationUseCase } from '../../../../application/use-cases/change-voyage-destination/use-case'
import { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { Country } from '../../../../domain/country'
import { InvalidCountry } from '../../../../domain/errors/dock-ship'
import {
  ShipNotAtPort,
  VoyageDestinationSameAsOrigin,
  VoyageDestinationUnchanged,
  VoyageRequiredToChangeDestination
} from '../../../../domain/errors/ship'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import {
  maximumVoyageChangeReasonLength,
  VoyageChangeReasonTooLong
} from '../../../../domain/voyage-change-reason'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id, IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { ChangeVoyageDestinationController } from './change-voyage-destination'
import { opaqueApplicationErrorMessage } from './error-response'

afterEach(() => vi.restoreAllMocks())

const makeController = (journal = new InMemoryEventJournal(new Name('testing'))) => {
  const useCase = new ChangeVoyageDestinationUseCase(journal)
  return { controller: new ChangeVoyageDestinationController(useCase), journal, useCase }
}

const putAtPortWithVoyage = async (journal: InMemoryEventJournal, id: Id) => {
  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    id,
    new Port(new PortName('Kingston'), new Country('US'))
  )
  await new PlanVoyageUseCase(journal).plan(id, new Port(new PortName('Boston'), new Country('US')))
}

const request = {
  id: 'abc',
  destination: { name: 'Belmont', country: 'CA' },
  reason: 'Berth unavailable'
}

test('changes a voyage destination using validated values', async () => {
  const { controller, journal } = makeController()
  await putAtPortWithVoyage(journal, new Id('abc'))

  await expect(
    controller.change({
      id: ' abc ',
      destination: { name: ' Belmont ', country: 'ca' },
      reason: ' Berth unavailable '
    })
  ).resolves.toMatchObject({ status: 200 })
})

test.each([
  { request: { ...request, id: '' }, error: new IsRequired('Id') },
  { request: { ...request, id: 'a!b' }, error: new IdNotAllowed('a!b') },
  { request: { ...request, destination: undefined }, error: new IsRequired('Destination') },
  { request: { ...request, destination: null }, error: new IsRequired('Destination') },
  { request: { ...request, destination: [] }, error: new IsRequired('Destination') },
  {
    request: { ...request, destination: { name: '', country: 'CA' } },
    error: new IsRequired('Port name')
  },
  {
    request: { ...request, destination: { name: 'a!', country: 'CA' } },
    error: new NameNotAllowed('a!', 'Port name')
  },
  {
    request: { ...request, destination: { name: 'Belmont', country: '' } },
    error: new IsRequired('Country')
  },
  {
    request: { ...request, destination: { name: 'Belmont', country: 'ZZ' } },
    error: new InvalidCountry('ZZ')
  },
  { request: { ...request, reason: '' }, error: new IsRequired('Voyage change reason') },
  {
    request: { ...request, reason: 'a'.repeat(maximumVoyageChangeReasonLength + 1) },
    error: new VoyageChangeReasonTooLong('a'.repeat(maximumVoyageChangeReasonLength + 1))
  }
])('rejects an invalid request with $error.code', async ({ request: invalid, error }) => {
  const { controller } = makeController()
  expect(await controller.change(invalid as never)).toMatchObject({
    status: 400,
    error: error.message
  })
})

test('reports domain conflicts', async () => {
  const { controller, journal } = makeController()
  expect(await controller.change(request)).toMatchObject({
    status: 404,
    error: new ShipNotFound('abc').message
  })
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    id,
    new Port(new PortName('Kingston'), new Country('US'))
  )
  expect(await controller.change(request)).toMatchObject({
    status: 409,
    error: new VoyageRequiredToChangeDestination().message
  })
  await new PlanVoyageUseCase(journal).plan(id, new Port(new PortName('Boston'), new Country('US')))
  expect(
    await controller.change({ ...request, destination: { name: 'Boston', country: 'US' } })
  ).toMatchObject({ status: 409, error: new VoyageDestinationUnchanged().message })
  expect(
    await controller.change({ ...request, destination: { name: 'Kingston', country: 'US' } })
  ).toMatchObject({ status: 409, error: new VoyageDestinationSameAsOrigin().message })
  await new SailShipUseCase(journal).sail(id)
  expect(await controller.change(request)).toMatchObject({
    status: 409,
    error: new ShipNotAtPort('change a voyage destination').message
  })
})

test('hides unexpected results and failures', async () => {
  const { controller, useCase } = makeController()
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'change').mockResolvedValueOnce({
    ok: false,
    error: new Error('unexpected result')
  } as never)
  expect(await controller.change(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
  vi.spyOn(useCase, 'change').mockRejectedValueOnce(new Error('unexpected failure'))
  expect(await controller.change(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
  expect(await controller.change(null as never)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
})
