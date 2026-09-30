import { EventJournalSchemaIncompatible } from './errors/event-journal'

interface NumberedMigration {
  readonly version: number
}

export const pendingMigrations = <Migration extends NumberedMigration>(
  database: string,
  bundledMigrations: readonly Migration[],
  appliedVersions: readonly number[]
): readonly Migration[] => {
  const bundledVersions = bundledMigrations.map(({ version }) => version)
  const expectedBundledVersions = bundledMigrations.map((_, index) => index + 1)

  if (JSON.stringify(bundledVersions) !== JSON.stringify(expectedBundledVersions)) {
    throw new EventJournalSchemaIncompatible(
      database,
      `bundled migration versions [${bundledVersions.join(', ')}] must be consecutive starting at 1`
    )
  }

  const expectedAppliedVersions = bundledVersions.slice(0, appliedVersions.length)

  if (JSON.stringify(appliedVersions) !== JSON.stringify(expectedAppliedVersions)) {
    throw new EventJournalSchemaIncompatible(
      database,
      `applied migration versions [${appliedVersions.join(', ')}] are not a prefix of bundled versions [${bundledVersions.join(', ')}]`
    )
  }

  return bundledMigrations.slice(appliedVersions.length)
}
