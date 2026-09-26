import { ApplicationError } from '../../shared/errors/kernel'

export class JournalVersionConflict extends ApplicationError {
  declare readonly code: 'JOURNAL_VERSION_CONFLICT'

  constructor(aggregateId: string, expectedVersion: number, actualVersion: number) {
    super({
      code: 'JOURNAL_VERSION_CONFLICT',
      kind: 'conflict',
      message: `Aggregate '${aggregateId}' is at version ${actualVersion}, expected ${expectedVersion}`,
      meta: { aggregateId, expectedVersion, actualVersion }
    })
  }
}
