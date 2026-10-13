import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'
import { expect, test, vi } from 'vitest'
import { Country } from '../../../domain/country'
import { eventPayloadHandler } from '../../../domain/events'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipDeparted } from '../../../domain/events/ship-departed'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { InvalidShipOverviewHistory } from './errors/ship-overview'
import { PostgreSqlShipOverviewProjection } from './postgresql-ship-overview'

const result = <TRow extends QueryResultRow>(rows: TRow[] = []): QueryResult<TRow> => ({
  command: '',
  fields: [],
  oid: 0,
  rowCount: rows.length,
  rows
})

const port = (name = 'Kingston') => new Port(new PortName(name), new Country('US'))
const registration = () => new ShipRegistered('ship-1', 'King Roy', port())

const projectionWith = (
  query: ReturnType<typeof vi.fn>
): { projection: PostgreSqlShipOverviewProjection; release: ReturnType<typeof vi.fn> } => {
  const release = vi.fn()
  const client = { query, release } as unknown as PoolClient
  const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool
  return { projection: new PostgreSqlShipOverviewProjection(pool), release }
}

test('locks the checkpoint and atomically projects a batch', async () => {
  const registered = registration()
  const departed = new ShipDeparted('ship-1')
  const query = vi.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM ships_n_cargo.ship_overview_checkpoint')) {
      return Promise.resolve(result([{ position: '0' }]))
    }
    if (sql.includes('FROM ships_n_cargo.event_journal')) {
      return Promise.resolve(
        result([
          {
            aggregate_id: 'ship-1',
            event_payload: eventPayloadHandler.serialize(registered),
            global_position: '1',
            version: '1'
          },
          {
            aggregate_id: 'ship-1',
            event_payload: eventPayloadHandler.serialize(departed),
            global_position: '2',
            version: '2'
          }
        ])
      )
    }
    if (sql.includes('FROM ships_n_cargo.ship_overview')) return Promise.resolve(result())
    return Promise.resolve(result())
  })
  const { projection, release } = projectionWith(query)

  await expect(projection.projectNextBatch(10)).resolves.toEqual({
    checkpoint: 2n,
    projectedEventCount: 2
  })

  expect(query).toHaveBeenNthCalledWith(1, 'BEGIN')
  expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'))
  expect(query).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('ORDER BY journal.global_position ASC'),
    ['0', 10]
  )
  expect(
    query.mock.calls.filter(([sql]) =>
      (sql as string).includes('FROM ships_n_cargo.ship_overview\n')
    )
  ).toHaveLength(1)
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO ships_n_cargo.ship_overview'),
    ['ship-1', 'King Roy', 'at-port', 'Kingston', 'US']
  )
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO ships_n_cargo.ship_overview'),
    ['ship-1', 'King Roy', 'at-sea', null, null]
  )
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining('UPDATE ships_n_cargo.ship_overview_checkpoint'),
    ['2']
  )
  expect(query).toHaveBeenLastCalledWith('COMMIT')
  expect(release).toHaveBeenCalledOnce()
})

test('resumes from an existing at-sea overview and preserves 64-bit checkpoints', async () => {
  const arrived = new ShipArrived('ship-1', port('Miami'))
  const query = vi.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM ships_n_cargo.ship_overview_checkpoint')) {
      return Promise.resolve(result([{ position: '9007199254740992' }]))
    }
    if (sql.includes('FROM ships_n_cargo.event_journal')) {
      return Promise.resolve(
        result([
          {
            aggregate_id: 'ship-1',
            event_payload: eventPayloadHandler.serialize(arrived),
            global_position: '9007199254740993',
            version: '3'
          }
        ])
      )
    }
    if (sql.includes('FROM ships_n_cargo.ship_overview')) {
      return Promise.resolve(
        result([
          {
            current_port_country: null,
            current_port_name: null,
            name: 'King Roy',
            ship_id: 'ship-1',
            status: 'at-sea'
          }
        ])
      )
    }
    return Promise.resolve(result())
  })
  const { projection } = projectionWith(query)

  await expect(projection.projectNextBatch(1)).resolves.toEqual({
    checkpoint: 9_007_199_254_740_993n,
    projectedEventCount: 1
  })
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO ships_n_cargo.ship_overview'),
    ['ship-1', 'King Roy', 'at-port', 'Miami', 'US']
  )
})

test('commits without advancing the checkpoint when the feed is caught up', async () => {
  const query = vi.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM ships_n_cargo.ship_overview_checkpoint')) {
      return Promise.resolve(result([{ position: '7' }]))
    }
    if (sql.includes('FROM ships_n_cargo.event_journal')) return Promise.resolve(result())
    return Promise.resolve(result())
  })
  const { projection } = projectionWith(query)

  await expect(projection.projectNextBatch(5)).resolves.toEqual({
    checkpoint: 7n,
    projectedEventCount: 0
  })
  expect(query).not.toHaveBeenCalledWith(
    expect.stringContaining('UPDATE ships_n_cargo.ship_overview_checkpoint'),
    expect.anything()
  )
  expect(query).toHaveBeenLastCalledWith('COMMIT')
})

test('rolls back malformed history without hiding the invariant error', async () => {
  const departed = new ShipDeparted('ship-1')
  const query = vi.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM ships_n_cargo.ship_overview_checkpoint')) {
      return Promise.resolve(result([{ position: '0' }]))
    }
    if (sql.includes('FROM ships_n_cargo.event_journal')) {
      return Promise.resolve(
        result([
          {
            aggregate_id: 'ship-1',
            event_payload: eventPayloadHandler.serialize(departed),
            global_position: '1',
            version: '1'
          }
        ])
      )
    }
    if (sql.includes('FROM ships_n_cargo.ship_overview')) return Promise.resolve(result())
    return Promise.resolve(result())
  })
  const { projection, release } = projectionWith(query)

  await expect(projection.projectNextBatch(1)).rejects.toThrow(InvalidShipOverviewHistory)
  expect(query).toHaveBeenLastCalledWith('ROLLBACK')
  expect(release).toHaveBeenCalledOnce()
})

test('wraps connection and query failures and preserves them when rollback also fails', async () => {
  const connectionFailure = new Error('connection failed')
  const unavailable = new PostgreSqlShipOverviewProjection({
    connect: vi.fn().mockRejectedValue(connectionFailure)
  } as unknown as Pool)

  await expect(unavailable.projectNextBatch(1)).rejects.toMatchObject({
    cause: connectionFailure,
    code: 'SHIP_OVERVIEW_PROJECTION_UNAVAILABLE'
  })

  const queryFailure = new Error('query failed')
  const query = vi.fn().mockImplementation((sql: string) => {
    if (sql === 'ROLLBACK') return Promise.reject(new Error('rollback failed'))
    if (sql === 'BEGIN') return Promise.resolve(result())
    return Promise.reject(queryFailure)
  })
  const { projection, release } = projectionWith(query)

  await expect(projection.projectNextBatch(1)).rejects.toMatchObject({
    cause: queryFailure,
    code: 'SHIP_OVERVIEW_PROJECTION_UNAVAILABLE'
  })
  expect(query).toHaveBeenLastCalledWith('ROLLBACK')
  expect(release).toHaveBeenCalledOnce()
})

test('validates batch size before acquiring a connection', async () => {
  const connect = vi.fn()
  const projection = new PostgreSqlShipOverviewProjection({ connect } as unknown as Pool)

  await expect(projection.projectNextBatch(0)).rejects.toMatchObject({
    code: 'INVALID_GLOBAL_FEED_BATCH_SIZE'
  })
  expect(connect).not.toHaveBeenCalled()
})

test('queries overviews by id, status, and current port', async () => {
  const rows = [
    {
      current_port_country: 'US',
      current_port_name: 'Miami',
      name: 'Sea Queen',
      ship_id: 'ship-2',
      status: 'at-port'
    }
  ]
  const query = vi.fn().mockResolvedValue(result(rows))
  const projection = new PostgreSqlShipOverviewProjection({ query } as unknown as Pool)

  await expect(projection.overviewFor('ship-2')).resolves.toEqual({
    currentPort: { country: 'US', name: 'Miami' },
    name: 'Sea Queen',
    shipId: 'ship-2',
    status: 'at-port'
  })
  expect(query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE ship_id = $1'), ['ship-2'])

  await expect(projection.overviewsMatching({ status: 'at-port' })).resolves.toHaveLength(1)
  expect(query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE status = $1'), ['at-port'])

  const atMiami = await projection.overviewsMatching({
    currentPort: { country: 'US', name: 'Miami' }
  })
  expect(atMiami).toHaveLength(1)
  expect(Object.isFrozen(atMiami)).toBe(true)
  expect(query).toHaveBeenLastCalledWith(
    expect.stringContaining('WHERE current_port_name = $1 AND current_port_country = $2'),
    ['Miami', 'US']
  )
})

test('returns no overview for an unknown id and wraps overview query failures', async () => {
  const query = vi.fn().mockResolvedValueOnce(result()).mockRejectedValue(new Error('unavailable'))
  const projection = new PostgreSqlShipOverviewProjection({ query } as unknown as Pool)

  await expect(projection.overviewFor('missing')).resolves.toBeUndefined()
  await expect(projection.overviewsMatching({ status: 'at-sea' })).rejects.toMatchObject({
    code: 'SHIP_OVERVIEW_PROJECTION_UNAVAILABLE'
  })
  await expect(projection.overviewFor('ship-1')).rejects.toMatchObject({
    code: 'SHIP_OVERVIEW_PROJECTION_UNAVAILABLE'
  })
})
