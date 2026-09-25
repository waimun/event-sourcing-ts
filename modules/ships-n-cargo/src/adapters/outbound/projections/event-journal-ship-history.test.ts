import { expect, test } from 'vitest'
import { CargoReference } from '../../../domain/cargo-reference'
import { Container } from '../../../domain/container'
import { Country } from '../../../domain/country'
import { ContainerLoaded } from '../../../domain/events/container-loaded'
import { ContainerUnloaded } from '../../../domain/events/container-unloaded'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipDeparted } from '../../../domain/events/ship-departed'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import { VoyagePlanned } from '../../../domain/events/voyage-planned'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { Id } from '../../../shared/domain/id'
import { Name } from '../../../shared/domain/name'
import { InMemoryEventJournal } from '../persistence/in-memory-event-journal'
import { UnsupportedShipHistoryEvent } from './errors/ship-history'
import { EventJournalShipHistoryProjection } from './event-journal-ship-history'

const occurredAt = new Date('2026-09-24T12:00:00.000Z')
const port = new Port(new PortName('Kingston'), new Country('US'))
const destination = new Port(new PortName('Singapore'), new Country('SG'))
const container = new Container(
  new Id('container-1'),
  new CargoReference('cargo-42'),
  new Name('Coffee beans', 'Container description')
)

test('projects every ship event into stable business history in stream order', async () => {
  const journal = new InMemoryEventJournal(new Name('history-test'))
  const events = [
    new ShipRegistered('ship-1', 'King Roy', port, occurredAt),
    new ContainerLoaded('ship-1', container, occurredAt),
    new ContainerUnloaded('ship-1', container, occurredAt),
    new VoyagePlanned('ship-1', port, destination, occurredAt),
    new ShipDeparted('ship-1', occurredAt),
    new ShipArrived('ship-1', destination, occurredAt)
  ]
  await journal.append('ship-1', 0, events)

  await expect(
    new EventJournalShipHistoryProjection(journal).historyFor('ship-1')
  ).resolves.toEqual({
    shipId: 'ship-1',
    history: [
      {
        kind: 'ship-registered',
        occurredAt: occurredAt.toISOString(),
        name: 'King Roy',
        port: { name: 'Kingston', country: 'US' }
      },
      {
        kind: 'container-loaded',
        occurredAt: occurredAt.toISOString(),
        containerId: 'container-1',
        cargoReference: 'cargo-42',
        description: 'Coffee beans'
      },
      {
        kind: 'container-unloaded',
        occurredAt: occurredAt.toISOString(),
        containerId: 'container-1',
        cargoReference: 'cargo-42',
        description: 'Coffee beans'
      },
      {
        kind: 'voyage-planned',
        occurredAt: occurredAt.toISOString(),
        origin: { name: 'Kingston', country: 'US' },
        destination: { name: 'Singapore', country: 'SG' }
      },
      { kind: 'ship-departed', occurredAt: occurredAt.toISOString() },
      {
        kind: 'ship-arrived',
        occurredAt: occurredAt.toISOString(),
        port: { name: 'Singapore', country: 'SG' }
      }
    ]
  })
})

test('returns no projection for an unknown ship', async () => {
  const journal = new InMemoryEventJournal(new Name('history-test'))

  await expect(
    new EventJournalShipHistoryProjection(journal).historyFor('missing')
  ).resolves.toBeUndefined()
})

test('rejects event types that have no stable history representation', async () => {
  const event = {
    aggregateId: 'ship-1',
    occurredAt,
    recordedAt: occurredAt,
    type: 'UnexpectedEvent',
    asJson: () => '{}'
  } satisfies DomainEvent
  const journal = {
    append: async () => undefined,
    eventsByAggregate: async () => ({ events: [event], version: 1 })
  }

  await expect(new EventJournalShipHistoryProjection(journal).historyFor('ship-1')).rejects.toEqual(
    new UnsupportedShipHistoryEvent('UnexpectedEvent')
  )
})
