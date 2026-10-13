import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, expect, test } from 'vitest'
import { Country } from '../../../domain/country'
import { ShipArrived } from '../../../domain/events/ship-arrived'
import { ShipDeparted } from '../../../domain/events/ship-departed'
import { ShipRegistered } from '../../../domain/events/ship-registered'
import { Port } from '../../../domain/port'
import { PortName } from '../../../domain/port-name'
import { SqliteEventJournal } from '../persistence/sqlite/event-journal'
import { InvalidShipOverviewHistory } from './errors/ship-overview'
import { SqliteShipOverviewProjection } from './sqlite-ship-overview'

const directories: string[] = []
const journals: SqliteEventJournal[] = []
const projections: SqliteShipOverviewProjection[] = []
const databases: DatabaseSync[] = []

const databasePath = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'ship-overview-'))
  directories.push(directory)
  return join(directory, 'journal.sqlite')
}

const journalAt = (path: string): SqliteEventJournal => {
  const journal = new SqliteEventJournal(path)
  journals.push(journal)
  return journal
}

const projectionAt = (path: string): SqliteShipOverviewProjection => {
  const projection = new SqliteShipOverviewProjection(path)
  projections.push(projection)
  return projection
}

const inspect = (path: string): DatabaseSync => {
  const database = new DatabaseSync(path)
  databases.push(database)
  return database
}

const port = (name = 'Kingston') => new Port(new PortName(name), new Country('US'))

afterEach(() => {
  projections.forEach((projection) => {
    projection.close()
  })
  journals.forEach((journal) => {
    journal.close()
  })
  databases.forEach((database) => {
    database.close()
  })
  projections.length = 0
  journals.length = 0
  databases.length = 0
  directories.forEach((directory) => {
    rmSync(directory, { force: true, recursive: true })
  })
  directories.length = 0
})

test('materializes ship overviews in bounded checkpointed batches', async () => {
  const path = databasePath()
  const journal = journalAt(path)
  await journal.append('ship-1', 0, [
    new ShipRegistered('ship-1', 'King Roy', port()),
    new ShipDeparted('ship-1'),
    new ShipArrived('ship-1', port('Miami'))
  ])
  await journal.append('ship-2', 0, [new ShipRegistered('ship-2', 'Sea Queen', port('Boston'))])
  const projection = projectionAt(path)

  await expect(projection.projectNextBatch(2)).resolves.toEqual({
    checkpoint: 2n,
    projectedEventCount: 2
  })
  await expect(projection.projectNextBatch(2)).resolves.toEqual({
    checkpoint: 4n,
    projectedEventCount: 2
  })
  await expect(projection.projectNextBatch(2)).resolves.toEqual({
    checkpoint: 4n,
    projectedEventCount: 0
  })

  expect(
    inspect(path)
      .prepare(
        `SELECT ship_id, name, status, current_port_name, current_port_country
         FROM ship_overview
         ORDER BY ship_id`
      )
      .all()
  ).toEqual([
    {
      current_port_country: 'US',
      current_port_name: 'Miami',
      name: 'King Roy',
      ship_id: 'ship-1',
      status: 'at-port'
    },
    {
      current_port_country: 'US',
      current_port_name: 'Boston',
      name: 'Sea Queen',
      ship_id: 'ship-2',
      status: 'at-port'
    }
  ])
})

test('resumes from the durable checkpoint after replacing the projector', async () => {
  const path = databasePath()
  const journal = journalAt(path)
  await journal.append('ship-1', 0, [new ShipRegistered('ship-1', 'King Roy', port())])
  const first = projectionAt(path)
  await first.projectNextBatch(1)
  first.close()

  await journal.append('ship-1', 1, [new ShipDeparted('ship-1')])
  const replacement = projectionAt(path)

  await expect(replacement.projectNextBatch(1)).resolves.toEqual({
    checkpoint: 2n,
    projectedEventCount: 1
  })
  expect(
    inspect(path)
      .prepare(
        `SELECT status, current_port_name, current_port_country,
                (SELECT CAST(position AS TEXT) FROM ship_overview_checkpoint) AS checkpoint
         FROM ship_overview
         WHERE ship_id = 'ship-1'`
      )
      .get()
  ).toEqual({
    checkpoint: '2',
    current_port_country: null,
    current_port_name: null,
    status: 'at-sea'
  })
})

test('rolls back overview changes and checkpoint advancement when a batch fails', async () => {
  const path = databasePath()
  const journal = journalAt(path)
  await journal.append('ship-1', 0, [new ShipRegistered('ship-1', 'King Roy', port())])
  await journal.append('ship-2', 0, [new ShipDeparted('ship-2')])
  const projection = projectionAt(path)

  await expect(projection.projectNextBatch(2)).rejects.toThrow(InvalidShipOverviewHistory)

  const database = inspect(path)
  expect(database.prepare('SELECT * FROM ship_overview').all()).toEqual([])
  expect(
    database
      .prepare('SELECT CAST(position AS TEXT) AS position FROM ship_overview_checkpoint')
      .get()
  ).toEqual({ position: '0' })

  await expect(projection.projectNextBatch(1)).resolves.toEqual({
    checkpoint: 1n,
    projectedEventCount: 1
  })
})

test('preserves checkpoints beyond the JavaScript safe-integer range', async () => {
  const path = databasePath()
  const journal = journalAt(path)
  inspect(path)
    .prepare('UPDATE event_journal_position SET next_position = ?')
    .run(9_007_199_254_740_993n)
  await journal.append('ship-1', 0, [new ShipRegistered('ship-1', 'King Roy', port())])
  const projection = projectionAt(path)

  await expect(projection.projectNextBatch(1)).resolves.toEqual({
    checkpoint: 9_007_199_254_740_993n,
    projectedEventCount: 1
  })
  expect(
    inspect(path)
      .prepare('SELECT CAST(position AS TEXT) AS position FROM ship_overview_checkpoint')
      .get()
  ).toEqual({ position: '9007199254740993' })
})

test('validates batch size before changing projection state', async () => {
  const projection = projectionAt(databasePath())

  await expect(projection.projectNextBatch(0)).rejects.toMatchObject({
    code: 'INVALID_GLOBAL_FEED_BATCH_SIZE'
  })
})

test('wraps database failures and closes idempotently', async () => {
  const projection = projectionAt(databasePath())
  projection.close()

  await expect(projection.projectNextBatch(1)).rejects.toMatchObject({
    code: 'SHIP_OVERVIEW_PROJECTION_UNAVAILABLE'
  })
  expect(() => projection.close()).not.toThrow()
})
