import type { Request, Response, Send } from 'express'
import { beforeEach, expect, test, vi } from 'vitest'
import { IsRequired } from '../../../../shared/domain/errors/is-required'
import { Name } from '../../../../shared/domain/name'
import { InMemoryEventJournal } from '../../../outbound/persistence/in-memory-event-journal'
import { createControllers } from '../controllers'
import { cancelVoyageHandler } from './cancel-voyage'
import { planVoyageHandler } from './plan-voyage'
import { registerShipHandler } from './register-ship'

const req: Partial<Request> = {}
const res: Partial<Response> = {}
const controllers = createControllers(new InMemoryEventJournal(new Name('cancel-test-journal')))
const registerShip = registerShipHandler(controllers.registerShip, () => 'cancel-generated-id')
const planVoyage = planVoyageHandler(controllers.planVoyage)
const cancelVoyage = cancelVoyageHandler(controllers.cancelVoyage)

beforeEach(() => {
  res.status = vi.fn<Send>().mockReturnValue(res as Response)
  res.json = vi.fn<Send>().mockReturnValue(res as Response)
})

test('maps a cancellation request to the controller', async () => {
  req.body = {
    id: 'cancel-generated-id',
    name: 'Queen Mary',
    port: { name: 'Kingston', country: 'US' }
  }
  await registerShip(req as Request, res as Response)
  req.body = {
    id: 'cancel-generated-id',
    destination: { name: 'Boston', country: 'US' }
  }
  await planVoyage(req as Request, res as Response)

  req.body = { id: ' cancel-generated-id ', reason: ' Charterer cancelled ' }
  await cancelVoyage(req as Request, res as Response)

  expect(res.status).toHaveBeenLastCalledWith(200)
  expect(res.json).toHaveBeenLastCalledWith({ status: 200, dateTime: expect.any(Date) })
})

test('normalizes a missing body id into validation', async () => {
  req.body = { reason: 'Charterer cancelled' }
  await cancelVoyage(req as Request, res as Response)

  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith({
    status: 400,
    error: new IsRequired('Id').message,
    dateTime: expect.any(Date)
  })
})
