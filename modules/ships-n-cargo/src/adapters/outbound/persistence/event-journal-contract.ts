import { describe, expect, test } from 'vitest'
import type { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import type { EventJournal } from '../../../application/ports/event-journal'
import { Country } from '../../../domain/country'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion
} from './errors/event-journal'

type JournalFactory = () =>
  | EventJournal<string, DomainEvent>
  | Promise<EventJournal<string, DomainEvent>>

const port = () => new Port(new PortName('Kingston'), new Country('US'))
const arrival = (id: string) => new ShipArrived(id, port())
const registration = (id: string, name = 'King Roy') => new ShipRegistered(id, name, port())

export const eventJournalContract = (makeJournal: JournalFactory): void => {
  describe('event journal contract', () => {
    test('missing streams start at version zero', async () => {
      const journal = await makeJournal()

      await expect(journal.eventsByAggregate('missing')).resolves.toEqual({
        events: [],
        version: 0
      })
    })

    test('appends events in order and advances the stream version', async () => {
      const journal = await makeJournal()
      const initialEvents = [registration('ship-1'), arrival('ship-1')]

      await journal.append('ship-1', 0, initialEvents)
      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: initialEvents,
        version: 2
      })

      const subsequentArrival = arrival('ship-1')
      await journal.append('ship-1', 2, [subsequentArrival])
      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: [...initialEvents, subsequentArrival],
        version: 3
      })
    })

    test('keeps aggregate streams and versions independent', async () => {
      const journal = await makeJournal()
      const firstRegistration = registration('ship-1')
      const secondRegistration = registration('ship-2')

      await journal.append('ship-1', 0, [firstRegistration])
      await journal.append('ship-2', 0, [secondRegistration])

      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: [firstRegistration],
        version: 1
      })
      await expect(journal.eventsByAggregate('ship-2')).resolves.toEqual({
        events: [secondRegistration],
        version: 1
      })
    })

    test('rejects stale appends with the actual version and leaves the stream unchanged', async () => {
      const journal = await makeJournal()
      const registrationEvent = registration('ship-1')
      await journal.append('ship-1', 0, [registrationEvent])

      await expect(
        journal.append('ship-1', 0, [arrival('ship-1'), arrival('ship-1')])
      ).rejects.toMatchObject({
        code: 'JOURNAL_VERSION_CONFLICT',
        meta: { aggregateId: 'ship-1', expectedVersion: 0, actualVersion: 1 }
      } satisfies Partial<JournalVersionConflict>)
      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: [registrationEvent],
        version: 1
      })
    })

    test('rejects empty appends without changing the stream', async () => {
      const journal = await makeJournal()

      await expect(journal.append('ship-1', 0, [])).rejects.toThrow(EventIsRequired)
      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: [],
        version: 0
      })
    })

    test('rejects mixed aggregate events atomically', async () => {
      const journal = await makeJournal()

      await expect(
        journal.append('ship-1', 0, [registration('ship-1'), arrival('ship-2')])
      ).rejects.toThrow(AggregateIdMismatch)
      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: [],
        version: 0
      })
      await expect(journal.eventsByAggregate('ship-2')).resolves.toEqual({
        events: [],
        version: 0
      })
    })

    test.each([-1, 0.5])(
      'rejects invalid expected version %s without changing the stream',
      async (expectedVersion) => {
        const journal = await makeJournal()

        await expect(
          journal.append('ship-1', expectedVersion, [registration('ship-1')])
        ).rejects.toThrow(InvalidExpectedVersion)
        await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
          events: [],
          version: 0
        })
      }
    )

    test('round-trips serialized events as immutable snapshots', async () => {
      const journal = await makeJournal()
      const registrationEvent = new ShipRegistered(
        'ship-1',
        'King Roy',
        port(),
        new Date('2020-01-01T00:00:00Z'),
        new Date('2020-01-02T00:00:00Z')
      )
      await journal.append('ship-1', 0, [registrationEvent])

      const firstRead = await journal.eventsByAggregate('ship-1')
      const secondRead = await journal.eventsByAggregate('ship-1')

      expect(firstRead.events[0]).not.toBe(registrationEvent)
      expect(secondRead.events[0]).not.toBe(firstRead.events[0])
      expect(firstRead).toEqual({ events: [registrationEvent], version: 1 })
      expect(secondRead).toEqual(firstRead)
      expect(firstRead.events[0]?.occurredAt).toEqual(registrationEvent.occurredAt)
      expect(firstRead.events[0]?.recordedAt).toEqual(registrationEvent.recordedAt)
      expect(Object.isFrozen(firstRead)).toBe(true)
      expect(Object.isFrozen(firstRead.events)).toBe(true)
      expect(Object.isFrozen(firstRead.events[0])).toBe(true)
      expect(() => (firstRead.events as DomainEvent[]).push(arrival('ship-1'))).toThrow(TypeError)
    })
  })
}
