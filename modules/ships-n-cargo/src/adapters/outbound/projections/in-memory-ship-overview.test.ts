import { expect, test } from 'vitest'
import { Country } from '../../../domain/country'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipDeparted } from '../../../domain/events/ship-departed'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Name } from '../../../shared/domain/name'
import { InMemoryEventJournal } from '../persistence/in-memory-event-journal'
import { InvalidShipOverviewHistory } from './errors/ship-overview'
import { InMemoryShipOverviewProjection } from './in-memory-ship-overview'

const port = (name = 'Kingston') => new Port(new PortName(name), new Country('US'))
const journal = () => new InMemoryEventJournal(new Name('projection-test'))

test('projects bounded batches and resumes from its checkpoint', async () => {
  const events = journal()
  await events.append('ship-1', 0, [
    new ShipRegistered('ship-1', 'King Roy', port()),
    new ShipDeparted('ship-1'),
    new ShipArrived('ship-1', port('Miami'))
  ])
  const projection = new InMemoryShipOverviewProjection(events)

  await expect(projection.projectNextBatch(2)).resolves.toEqual({
    checkpoint: 2n,
    projectedEventCount: 2
  })
  await expect(projection.overviewFor('ship-1')).resolves.toEqual({
    name: 'King Roy',
    shipId: 'ship-1',
    status: 'at-sea'
  })
  await expect(projection.projectNextBatch(2)).resolves.toEqual({
    checkpoint: 3n,
    projectedEventCount: 1
  })
  await expect(projection.overviewFor('ship-1')).resolves.toEqual({
    currentPort: { country: 'US', name: 'Miami' },
    name: 'King Roy',
    shipId: 'ship-1',
    status: 'at-port'
  })
  await expect(projection.projectNextBatch(2)).resolves.toEqual({
    checkpoint: 3n,
    projectedEventCount: 0
  })
})

test('leaves both overview and checkpoint unchanged when a batch fails', async () => {
  const events = journal()
  await events.append('ship-1', 0, [new ShipRegistered('ship-1', 'King Roy', port())])
  await events.append('ship-2', 0, [new ShipDeparted('ship-2')])
  const projection = new InMemoryShipOverviewProjection(events)

  await expect(projection.projectNextBatch(2)).rejects.toThrow(InvalidShipOverviewHistory)
  await expect(projection.overviewFor('ship-1')).resolves.toBeUndefined()

  await expect(projection.projectNextBatch(1)).resolves.toEqual({
    checkpoint: 1n,
    projectedEventCount: 1
  })
  await expect(projection.overviewFor('ship-1')).resolves.toEqual({
    currentPort: { country: 'US', name: 'Kingston' },
    name: 'King Roy',
    shipId: 'ship-1',
    status: 'at-port'
  })
})

test('returns detached immutable overview snapshots', async () => {
  const events = journal()
  await events.append('ship-1', 0, [new ShipRegistered('ship-1', 'King Roy', port())])
  const projection = new InMemoryShipOverviewProjection(events)
  await projection.projectNextBatch(1)

  const first = await projection.overviewFor('ship-1')
  const second = await projection.overviewFor('ship-1')

  expect(first).toEqual(second)
  expect(first).not.toBe(second)
  expect(first?.currentPort).not.toBe(second?.currentPort)
  expect(Object.isFrozen(first)).toBe(true)
})

test('queries overviews by status or current port in ship-id order', async () => {
  const events = journal()
  await events.append('ship-2', 0, [new ShipRegistered('ship-2', 'Sea Queen', port('Miami'))])
  await events.append('ship-1', 0, [
    new ShipRegistered('ship-1', 'King Roy', port('Miami')),
    new ShipDeparted('ship-1')
  ])
  await events.append('ship-3', 0, [new ShipRegistered('ship-3', 'Ocean Ray', port('Miami'))])
  const projection = new InMemoryShipOverviewProjection(events)
  await projection.projectNextBatch(10)

  await expect(projection.overviewsMatching({ status: 'at-port' })).resolves.toEqual([
    {
      currentPort: { country: 'US', name: 'Miami' },
      name: 'Sea Queen',
      shipId: 'ship-2',
      status: 'at-port'
    },
    {
      currentPort: { country: 'US', name: 'Miami' },
      name: 'Ocean Ray',
      shipId: 'ship-3',
      status: 'at-port'
    }
  ])
  const atMiami = await projection.overviewsMatching({
    currentPort: { country: 'US', name: 'Miami' }
  })
  expect(atMiami.map(({ shipId }) => shipId)).toEqual(['ship-2', 'ship-3'])
  expect(Object.isFrozen(atMiami)).toBe(true)
  expect(Object.isFrozen(atMiami[0])).toBe(true)
  await expect(projection.overviewFor('missing')).resolves.toBeUndefined()
})
