import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { JournalVersionConflict } from '../../../application/errors/journal-version-conflict'
import { Country } from '../../../domain/country'
import { EventSerializerNotFound } from '../../../domain/errors/event-payload-handler'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipCreated } from '../../../domain/events/ship-created'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import type { EventJournalUnavailable } from '../../../shared/error'
import {
  AggregateIdMismatch,
  EventIsRequired,
  InvalidExpectedVersion
} from './errors/event-journal'
import { PostgreSqlEventJournal } from './postgresql-event-journal'
import { EVENT_JOURNAL_CONSTRAINTS } from './postgresql-event-journal-schema'

const result = <TRow extends QueryResultRow>(rows: TRow[] = []): QueryResult<TRow> => ({
  command: '',
  rowCount: rows.length,
  oid: 0,
  fields: [],
  rows
})

const pools: Pool[] = []
const makePool = (): Pool => {
  const pool = new Pool()
  pools.push(pool)
  return pool
}

const makeClient = (...results: Array<QueryResult<QueryResultRow>>): PoolClient =>
  ({
    query: vi.fn().mockImplementation(() => Promise.resolve(results.shift() ?? result())),
    release: vi.fn()
  }) as unknown as PoolClient

const arrival = (id: string) =>
  new ShipArrived(id, new Port(new PortName('Kingston'), new Country('US')))

afterEach(async () => {
  await Promise.all(pools.splice(0).map((pool) => pool.end()))
})

describe('eventsByAggregate', () => {
  test('reads serialized events in database order and reports their version', async () => {
    const pool = makePool()
    const created = new ShipCreated(
      'ship-1',
      'King Roy',
      new Date('2020-01-01T00:00:00Z'),
      new Date('2020-01-02T00:00:00Z')
    )
    const arrived = arrival('ship-1')
    vi.spyOn(pool, 'query').mockResolvedValue(
      result([
        {
          event_payload: JSON.stringify({ ...JSON.parse(created.asJson()), name: created.name }),
          version: '1'
        },
        {
          event_payload: JSON.stringify({
            ...JSON.parse(arrived.asJson()),
            portName: arrived.port.name,
            portCountry: arrived.port.country
          }),
          version: '2'
        }
      ]) as never
    )

    const stream = await new PostgreSqlEventJournal(pool).eventsByAggregate('ship-1')

    expect(stream).toEqual({ events: [created, arrived], version: 2 })
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY version ASC'), [
      'ship-1'
    ])
  })

  test('returns an empty version-zero stream when no rows exist', async () => {
    const pool = makePool()
    vi.spyOn(pool, 'query').mockResolvedValue(result() as never)

    await expect(new PostgreSqlEventJournal(pool).eventsByAggregate('missing')).resolves.toEqual({
      events: [],
      version: 0
    })
  })

  test('returns the highest stored version rather than inferring it from event count', async () => {
    const pool = makePool()
    const created = new ShipCreated('ship-1', 'King Roy')
    vi.spyOn(pool, 'query').mockResolvedValue(
      result([
        {
          event_payload: JSON.stringify({ ...JSON.parse(created.asJson()), name: created.name }),
          version: '7'
        }
      ]) as never
    )

    await expect(
      new PostgreSqlEventJournal(pool).eventsByAggregate('ship-1')
    ).resolves.toMatchObject({ events: [created], version: 7 })
  })

  test('classifies query failures as journal infrastructure failures', async () => {
    const pool = makePool()
    const cause = new Error('connection lost')
    vi.spyOn(pool, 'query').mockRejectedValue(cause)

    await expect(
      new PostgreSqlEventJournal(pool).eventsByAggregate('ship-1')
    ).rejects.toMatchObject({
      code: 'EVENT_JOURNAL_UNAVAILABLE',
      meta: { operation: 'eventsByAggregate' },
      cause
    } satisfies Partial<EventJournalUnavailable>)
  })

  test('does not disguise deserialization invariants as database failures', async () => {
    const pool = makePool()
    vi.spyOn(pool, 'query').mockResolvedValue(
      result([{ event_payload: JSON.stringify({ type: 'UnknownEvent' }), version: '1' }]) as never
    )

    await expect(new PostgreSqlEventJournal(pool).eventsByAggregate('ship-1')).rejects.toThrow(
      EventSerializerNotFound
    )
  })
})

describe('append', () => {
  test('writes a multi-event append with consecutive versions in one transaction', async () => {
    const pool = makePool()
    const client = makeClient(result(), result([{ version: '2' }]), result(), result())
    vi.spyOn(pool, 'connect').mockResolvedValue(client as never)
    const events = [arrival('ship-1'), arrival('ship-1')]

    await new PostgreSqlEventJournal(pool).append('ship-1', 2, events)

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN')
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('ORDER BY version DESC'),
      ['ship-1']
    )
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('VALUES ($1, $2, $3), ($4, $5, $6)'),
      ['ship-1', 3, expect.any(String), 'ship-1', 4, expect.any(String)]
    )
    expect(client.query).toHaveBeenNthCalledWith(4, 'COMMIT')
    expect(client.release).toHaveBeenCalledOnce()
  })

  test.each([
    {
      name: 'empty appends',
      expectedVersion: 0,
      events: [],
      error: EventIsRequired
    },
    {
      name: 'negative versions',
      expectedVersion: -1,
      events: [new ShipCreated('ship-1', 'King Roy')],
      error: InvalidExpectedVersion
    },
    {
      name: 'fractional versions',
      expectedVersion: 0.5,
      events: [new ShipCreated('ship-1', 'King Roy')],
      error: InvalidExpectedVersion
    },
    {
      name: 'events from another aggregate',
      expectedVersion: 0,
      events: [new ShipCreated('ship-2', 'King Roy')],
      error: AggregateIdMismatch
    }
  ])(
    'rejects $name before acquiring a database client',
    async ({ expectedVersion, events, error }) => {
      const pool = makePool()
      const connect = vi.spyOn(pool, 'connect')

      await expect(
        new PostgreSqlEventJournal(pool).append('ship-1', expectedVersion, events)
      ).rejects.toThrow(error)
      expect(connect).not.toHaveBeenCalled()
    }
  )

  test('rejects a stale decision with the stored version and rolls back', async () => {
    const pool = makePool()
    const client = makeClient(result(), result([{ version: '3' }]), result())
    vi.spyOn(pool, 'connect').mockResolvedValue(client as never)

    await expect(
      new PostgreSqlEventJournal(pool).append('ship-1', 2, [arrival('ship-1')])
    ).rejects.toMatchObject({
      code: 'JOURNAL_VERSION_CONFLICT',
      meta: { aggregateId: 'ship-1', expectedVersion: 2, actualVersion: 3 }
    } satisfies Partial<JournalVersionConflict>)
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalledOnce()
  })

  test('translates only the stream-position primary-key race to a version conflict', async () => {
    const pool = makePool()
    const race = { code: '23505', constraint: EVENT_JOURNAL_CONSTRAINTS.streamPosition }
    const client = makeClient(result(), result(), result())
    vi.mocked(client.query)
      .mockResolvedValueOnce(result() as never)
      .mockResolvedValueOnce(result() as never)
      .mockRejectedValueOnce(race)
      .mockResolvedValueOnce(result() as never)
    vi.spyOn(pool, 'connect').mockResolvedValue(client as never)
    vi.spyOn(pool, 'query').mockResolvedValue(result([{ version: '1' }]) as never)

    await expect(
      new PostgreSqlEventJournal(pool).append('ship-1', 0, [arrival('ship-1')])
    ).rejects.toMatchObject({
      code: 'JOURNAL_VERSION_CONFLICT',
      meta: { aggregateId: 'ship-1', expectedVersion: 0, actualVersion: 1 }
    })
  })

  test('classifies uniqueness violations from other constraints as infrastructure failures', async () => {
    const pool = makePool()
    const cause = { code: '23505', constraint: 'unrelated_unique_constraint' }
    const client = makeClient()
    vi.mocked(client.query)
      .mockResolvedValueOnce(result() as never)
      .mockResolvedValueOnce(result() as never)
      .mockRejectedValueOnce(cause)
      .mockResolvedValueOnce(result() as never)
    vi.spyOn(pool, 'connect').mockResolvedValue(client as never)

    await expect(
      new PostgreSqlEventJournal(pool).append('ship-1', 0, [arrival('ship-1')])
    ).rejects.toMatchObject({
      code: 'EVENT_JOURNAL_UNAVAILABLE',
      meta: { operation: 'append' },
      cause
    })
  })

  test('classifies client acquisition and race-version query failures', async () => {
    const pool = makePool()
    const connectionFailure = new Error('no connection')
    vi.spyOn(pool, 'connect').mockRejectedValueOnce(connectionFailure)
    await expect(
      new PostgreSqlEventJournal(pool).append('ship-1', 0, [arrival('ship-1')])
    ).rejects.toMatchObject({ cause: connectionFailure })

    const race = { code: '23505', constraint: EVENT_JOURNAL_CONSTRAINTS.streamPosition }
    const client = makeClient()
    vi.mocked(client.query)
      .mockResolvedValueOnce(result() as never)
      .mockResolvedValueOnce(result() as never)
      .mockRejectedValueOnce(race)
      .mockResolvedValueOnce(result() as never)
    vi.spyOn(pool, 'connect').mockResolvedValueOnce(client as never)
    const versionFailure = new Error('read failed')
    vi.spyOn(pool, 'query').mockRejectedValue(versionFailure)

    await expect(
      new PostgreSqlEventJournal(pool).append('ship-1', 0, [arrival('ship-1')])
    ).rejects.toMatchObject({ cause: versionFailure })
  })
})
