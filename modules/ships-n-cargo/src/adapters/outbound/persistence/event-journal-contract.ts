import { describe, expect, test } from 'vitest'
import type { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import type { EventJournal, GlobalEventFeed } from '../../../application/ports/event-journal'
import { Country } from '../../../domain/country'
import type { DomainEvent } from '../../../domain/events/domain-event'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion,
  InvalidGlobalFeedBatchSize,
  InvalidGlobalPosition,
  MAX_GLOBAL_FEED_BATCH_SIZE
} from './errors/event-journal'

type JournalFactory = () =>
  | (EventJournal<string, DomainEvent> & GlobalEventFeed<string, DomainEvent>)
  | Promise<EventJournal<string, DomainEvent> & GlobalEventFeed<string, DomainEvent>>

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

    test('preserves numeric stream order beyond version nine', async () => {
      const journal = await makeJournal()
      const firstTenEvents = Array.from({ length: 10 }, (_, index) =>
        registration('ship-1', `Registration ${index + 1}`)
      )
      const eleventhEvent = registration('ship-1', 'Registration 11')

      await journal.append('ship-1', 0, firstTenEvents)

      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: firstTenEvents,
        version: 10
      })
      await expect(journal.append('ship-1', 10, [eleventhEvent])).resolves.toBeUndefined()
      await expect(journal.eventsByAggregate('ship-1')).resolves.toEqual({
        events: [...firstTenEvents, eleventhEvent],
        version: 11
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

    test('starts with an empty global feed at position zero', async () => {
      const journal = await makeJournal()

      await expect(journal.globalHeadPosition()).resolves.toBe(0n)
      await expect(journal.globalEventsAfter(0n, 10)).resolves.toEqual([])
    })

    test('assigns consecutive global positions in append order across streams', async () => {
      const journal = await makeJournal()
      const first = registration('ship-1')
      const second = arrival('ship-1')
      const third = registration('ship-2')

      await journal.append('ship-1', 0, [first, second])
      await journal.append('ship-2', 0, [third])

      await expect(journal.globalHeadPosition()).resolves.toBe(3n)
      const entries = await journal.globalEventsAfter(0n, 10)
      expect(entries).toEqual([
        { aggregateId: 'ship-1', event: first, position: 1n, streamVersion: 1 },
        { aggregateId: 'ship-1', event: second, position: 2n, streamVersion: 2 },
        { aggregateId: 'ship-2', event: third, position: 3n, streamVersion: 1 }
      ])
      expect(Object.isFrozen(entries)).toBe(true)
      expect(entries.every((entry) => Object.isFrozen(entry))).toBe(true)
      expect(entries.every((entry) => Object.isFrozen(entry.event))).toBe(true)
    })

    test('reads the global feed in bounded pages after an exclusive position', async () => {
      const journal = await makeJournal()
      const events = Array.from({ length: 11 }, (_, index) =>
        registration('ship-1', `Registration ${index + 1}`)
      )
      await journal.append('ship-1', 0, events)

      const firstPage = await journal.globalEventsAfter(0n, 10)
      const secondPage = await journal.globalEventsAfter(firstPage[9].position, 10)

      expect(firstPage.map(({ position }) => position)).toEqual(
        Array.from({ length: 10 }, (_, index) => BigInt(index + 1))
      )
      expect(secondPage).toEqual([
        {
          aggregateId: 'ship-1',
          event: events[10],
          position: 11n,
          streamVersion: 11
        }
      ])
    })

    test('does not consume global positions when an append fails', async () => {
      const journal = await makeJournal()
      const first = registration('ship-1')
      const second = registration('ship-2')
      await journal.append('ship-1', 0, [first])

      await expect(journal.append('ship-1', 0, [arrival('ship-1')])).rejects.toMatchObject({
        code: 'JOURNAL_VERSION_CONFLICT'
      })
      await journal.append('ship-2', 0, [second])

      await expect(journal.globalEventsAfter(0n, 10)).resolves.toEqual([
        { aggregateId: 'ship-1', event: first, position: 1n, streamVersion: 1 },
        { aggregateId: 'ship-2', event: second, position: 2n, streamVersion: 1 }
      ])
    })

    test('returns fresh event snapshots from the global feed', async () => {
      const journal = await makeJournal()
      const event = registration('ship-1')
      await journal.append('ship-1', 0, [event])

      const firstRead = await journal.globalEventsAfter(0n, 1)
      const secondRead = await journal.globalEventsAfter(0n, 1)

      expect(firstRead[0].event).not.toBe(event)
      expect(secondRead[0].event).not.toBe(firstRead[0].event)
      expect(secondRead).toEqual(firstRead)
    })

    test('rejects invalid global feed cursors and batch sizes', async () => {
      const journal = await makeJournal()

      await expect(journal.globalEventsAfter(-1n, 1)).rejects.toThrow(InvalidGlobalPosition)
      for (const batchSize of [0, -1, 0.5, MAX_GLOBAL_FEED_BATCH_SIZE + 1]) {
        await expect(journal.globalEventsAfter(0n, batchSize)).rejects.toThrow(
          InvalidGlobalFeedBatchSize
        )
      }
    })
  })
}
