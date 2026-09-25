import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { DivertShipUseCase } from '../../../../application/use-cases/divert-ship/use-case'
import { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { Country } from '../../../../domain/country'
import { InvalidCountry } from '../../../../domain/errors/dock-ship'
import { ShipNotAtSea, VoyageDestinationUnchanged } from '../../../../domain/errors/ship'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id, IdNotAllowed } from '../../../../shared/domain/id'
import { Name, NameNotAllowed } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { DivertShipController } from './divert-ship'
import { opaqueApplicationErrorMessage } from './error-response'

afterEach(() => vi.restoreAllMocks())

const makeController = (journal = new InMemoryEventJournal(new Name('testing'))) => {
  const useCase = new DivertShipUseCase(journal)
  return { controller: new DivertShipController(useCase), journal, useCase }
}

const putAtSea = async (journal: InMemoryEventJournal, id: Id) => {
  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    id,
    new Port(new PortName('Kingston'), new Country('US'))
  )
  await new PlanVoyageUseCase(journal).plan(id, new Port(new PortName('Boston'), new Country('US')))
  await new SailShipUseCase(journal).sail(id)
}

test('diverts a ship using a validated destination', async () => {
  const { controller, journal } = makeController()
  await putAtSea(journal, new Id('abc'))

  await expect(
    controller.divert({ id: 'abc', destination: { name: ' Belmont ', country: 'ca' } })
  ).resolves.toMatchObject({ status: 200 })
})

test.each([
  {
    request: { id: '', destination: { name: 'Belmont', country: 'CA' } },
    error: new IsRequired('Id')
  },
  {
    request: { id: 'a!b', destination: { name: 'Belmont', country: 'CA' } },
    error: new IdNotAllowed('a!b')
  },
  { request: { id: 'abc' }, error: new IsRequired('Destination') },
  { request: { id: 'abc', destination: null }, error: new IsRequired('Destination') },
  { request: { id: 'abc', destination: [] }, error: new IsRequired('Destination') },
  {
    request: { id: 'abc', destination: { name: '', country: 'CA' } },
    error: new IsRequired('Port name')
  },
  {
    request: { id: 'abc', destination: { name: 'a!', country: 'CA' } },
    error: new NameNotAllowed('a!', 'Port name')
  },
  {
    request: { id: 'abc', destination: { name: 'Belmont', country: '' } },
    error: new IsRequired('Country')
  },
  {
    request: { id: 'abc', destination: { name: 'Belmont', country: 'ZZ' } },
    error: new InvalidCountry('ZZ')
  }
])('rejects an invalid request with $error.code', async ({ request, error }) => {
  const { controller } = makeController()

  expect(await controller.divert(request as never)).toMatchObject({
    status: 400,
    error: error.message
  })
})

test('reports missing ships and diversion conflicts', async () => {
  const { controller, journal } = makeController()
  const request = { id: 'abc', destination: { name: 'Belmont', country: 'CA' } }
  expect(await controller.divert(request)).toMatchObject({
    status: 404,
    error: new ShipNotFound('abc').message
  })

  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    id,
    new Port(new PortName('Kingston'), new Country('US'))
  )
  expect(await controller.divert(request)).toMatchObject({
    status: 409,
    error: new ShipNotAtSea('divert').message
  })

  await new PlanVoyageUseCase(journal).plan(id, new Port(new PortName('Boston'), new Country('US')))
  await new SailShipUseCase(journal).sail(id)
  expect(
    await controller.divert({ id: 'abc', destination: { name: 'Boston', country: 'US' } })
  ).toMatchObject({ status: 409, error: new VoyageDestinationUnchanged().message })
})

test('hides unexpected application results and failures', async () => {
  const { controller, useCase } = makeController()
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'divert').mockResolvedValueOnce({
    ok: false,
    error: new Error('unexpected result')
  } as never)

  const request = { id: 'abc', destination: { name: 'Belmont', country: 'CA' } }
  expect(await controller.divert(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })

  vi.spyOn(useCase, 'divert').mockRejectedValueOnce(new Error('unexpected failure'))
  expect(await controller.divert(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
})

test('hides unexpected request parsing failures', async () => {
  const { controller } = makeController()
  vi.spyOn(console, 'error').mockImplementation(vi.fn())

  expect(await controller.divert(null as never)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
})
