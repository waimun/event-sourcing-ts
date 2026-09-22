import type { ExpectedError } from '../shared/error'
import { ConcurrentCommandConflict } from './errors/concurrent-command-conflict'
import { JournalVersionConflict } from './errors/journal-version-conflict'
import { failure, type Result } from './result'

export const concurrentCommandAttemptLimit = 3

export const rerunConcurrentCommand = async <Success, Failure extends ExpectedError>(
  aggregateId: string,
  command: () => Promise<Result<Success, Failure>>
): Promise<Result<Success, Failure | ConcurrentCommandConflict>> => {
  let attempts = 0

  while (attempts < concurrentCommandAttemptLimit) {
    attempts += 1
    try {
      return await command()
    } catch (error) {
      if (error instanceof JournalVersionConflict) continue
      throw error
    }
  }

  return failure(new ConcurrentCommandConflict(aggregateId, attempts))
}
