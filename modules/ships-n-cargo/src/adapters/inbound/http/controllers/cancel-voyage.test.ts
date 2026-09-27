import { afterEach, expect, test, vi } from 'vitest'
import { ShipNotFound } from '../../../../application/errors/ship-not-found'
import { CancelVoyageUseCase } from '../../../../application/use-cases/cancel-voyage/use-case'
import { PlanVoyageUseCase } from '../../../../application/use-cases/plan-voyage/use-case'
import { RegisterShipUseCase } from '../../../../application/use-cases/register-ship/use-case'
import { SailShipUseCase } from '../../../../application/use-cases/sail-ship/use-case'
import { Country } from '../../../../domain/country'
import { ShipNotAtPort, VoyageRequiredToCancel } from '../../../../domain/errors/ship'
import { Port } from '../../../../domain/port'
import { PortName } from '../../../../domain/port-name'
import {
  maximumVoyageChangeReasonLength,
  VoyageChangeReasonTooLong
} from '../../../../domain/voyage-change-reason'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Id, IdNotAllowed } from '../../../../shared/domain/id'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { CancelVoyageController } from './cancel-voyage'
import { opaqueApplicationErrorMessage } from './error-response'

afterEach(() => vi.restoreAllMocks())

const makeController = (journal = new InMemoryEventJournal(new Name('testing'))) => {
  const useCase = new CancelVoyageUseCase(journal)
  return { controller: new CancelVoyageController(useCase), journal, useCase }
}

const request = { id: 'abc', reason: 'Charterer cancelled' }

test('cancels a planned voyage using a validated reason', async () => {
  const { controller, journal } = makeController()
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    id,
    new Port(new PortName('Kingston'), new Country('US'))
  )
  await new PlanVoyageUseCase(journal).plan(id, new Port(new PortName('Boston'), new Country('US')))

  await expect(
    controller.cancel({ id: ' abc ', reason: ' Charterer cancelled ' })
  ).resolves.toMatchObject({
    status: 200
  })
})

test.each([
  { request: { ...request, id: '' }, error: new IsRequired('Id') },
  { request: { ...request, id: 'a!b' }, error: new IdNotAllowed('a!b') },
  { request: { ...request, reason: '' }, error: new IsRequired('Voyage change reason') },
  {
    request: { ...request, reason: 'a'.repeat(maximumVoyageChangeReasonLength + 1) },
    error: new VoyageChangeReasonTooLong('a'.repeat(maximumVoyageChangeReasonLength + 1))
  }
])('rejects an invalid request with $error.code', async ({ request: invalid, error }) => {
  const { controller } = makeController()
  expect(await controller.cancel(invalid)).toMatchObject({ status: 400, error: error.message })
})

test('reports missing ships and cancellation conflicts', async () => {
  const { controller, journal } = makeController()
  expect(await controller.cancel(request)).toMatchObject({
    status: 404,
    error: new ShipNotFound('abc').message
  })
  const id = new Id('abc')
  await new RegisterShipUseCase(journal).register(
    new Name('Queen Mary'),
    id,
    new Port(new PortName('Kingston'), new Country('US'))
  )
  expect(await controller.cancel(request)).toMatchObject({
    status: 409,
    error: new VoyageRequiredToCancel().message
  })
  await new PlanVoyageUseCase(journal).plan(id, new Port(new PortName('Boston'), new Country('US')))
  await new SailShipUseCase(journal).sail(id)
  expect(await controller.cancel(request)).toMatchObject({
    status: 409,
    error: new ShipNotAtPort('cancel a voyage').message
  })
})

test('hides unexpected results and failures', async () => {
  const { controller, useCase } = makeController()
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  vi.spyOn(useCase, 'cancel').mockResolvedValueOnce({
    ok: false,
    error: new Error('unexpected result')
  } as never)
  expect(await controller.cancel(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
  vi.spyOn(useCase, 'cancel').mockRejectedValueOnce(new Error('unexpected failure'))
  expect(await controller.cancel(request)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
  expect(await controller.cancel(null as never)).toMatchObject({
    status: 500,
    error: opaqueApplicationErrorMessage
  })
})
