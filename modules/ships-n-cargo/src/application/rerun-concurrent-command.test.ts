import { expect, test, vi } from 'vitest'
import { ConcurrentCommandConflict } from './errors/concurrent-command-conflict'
import { JournalVersionConflict } from './errors/journal-version-conflict'
import { concurrentCommandAttemptLimit, rerunConcurrentCommand } from './rerun-concurrent-command'
import { success } from './result'

test('reruns a command after a journal version conflict', async () => {
  const command = vi
    .fn()
    .mockRejectedValueOnce(new JournalVersionConflict('ship-1', 1, 2))
    .mockResolvedValue(success('done'))

  await expect(rerunConcurrentCommand('ship-1', command)).resolves.toEqual({
    ok: true,
    value: 'done'
  })
  expect(command).toHaveBeenCalledTimes(2)
})

test('returns a declared conflict when every bounded attempt races', async () => {
  const command = vi.fn().mockRejectedValue(new JournalVersionConflict('ship-1', 1, 2))

  const result = await rerunConcurrentCommand('ship-1', command)

  expect(result).toMatchObject({
    ok: false,
    error: new ConcurrentCommandConflict('ship-1', concurrentCommandAttemptLimit)
  })
  expect(command).toHaveBeenCalledTimes(concurrentCommandAttemptLimit)
})

test('does not retry another failure', async () => {
  const journalFailure = new Error('journal unavailable')
  const command = vi.fn().mockRejectedValue(journalFailure)

  await expect(rerunConcurrentCommand('ship-1', command)).rejects.toBe(journalFailure)
  expect(command).toHaveBeenCalledOnce()
})
