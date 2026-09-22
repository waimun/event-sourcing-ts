import { ApplicationError } from '../../shared/error'

export class ConcurrentCommandConflict extends ApplicationError {
  declare readonly code: 'CONCURRENT_COMMAND_CONFLICT'

  constructor(aggregateId: string, attempts: number) {
    super({
      code: 'CONCURRENT_COMMAND_CONFLICT',
      kind: 'conflict',
      message: `Aggregate '${aggregateId}' changed concurrently; please retry the command`,
      meta: { aggregateId, attempts }
    })
  }
}
