import { describe, expect, test } from 'vitest'
import type { EventJournalSchemaIncompatible } from './errors/event-journal'
import { pendingMigrations } from './migration-versions'

interface TestMigration {
  readonly version: number
  readonly name: string
}

const migration = (version: number): TestMigration => ({
  version,
  name: `migration-${version}`
})

test('selects every bundled migration after the applied prefix', () => {
  const migrations = [migration(1), migration(2), migration(3)]

  expect(pendingMigrations('Test database', migrations, [1])).toEqual([
    migrations[1],
    migrations[2]
  ])
})

describe.each([
  { defect: 'a gap', migrations: [migration(1), migration(3)] },
  { defect: 'a duplicate', migrations: [migration(1), migration(1)] },
  { defect: 'reordered versions', migrations: [migration(2), migration(1)] }
])('rejects bundled migrations with $defect', ({ migrations }) => {
  test('before planning pending migrations', () => {
    expect(() => pendingMigrations('Test database', migrations, [])).toThrowError(
      expect.objectContaining({
        code: 'EVENT_JOURNAL_SCHEMA_INCOMPATIBLE',
        meta: {
          database: 'Test database',
          details: `bundled migration versions [${migrations.map(({ version }) => version).join(', ')}] must be consecutive starting at 1`
        }
      }) satisfies Partial<EventJournalSchemaIncompatible>
    )
  })
})
