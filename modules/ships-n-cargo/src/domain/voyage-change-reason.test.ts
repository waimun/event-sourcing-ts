import { expect, test } from 'vitest'
import { IsRequired } from '../shared/domain/errors/is-required'
import {
  maximumVoyageChangeReasonLength,
  VoyageChangeReason,
  VoyageChangeReasonTooLong
} from './voyage-change-reason'

test('trims and accepts reasons from one through five hundred characters', () => {
  expect(new VoyageChangeReason(' amended by charterer ').value).toBe('amended by charterer')
  expect(new VoyageChangeReason('a').value).toBe('a')
  expect(new VoyageChangeReason('a'.repeat(maximumVoyageChangeReasonLength)).value).toHaveLength(
    maximumVoyageChangeReasonLength
  )
})

test('rejects blank and overlong reasons without truncating them', () => {
  expect(() => new VoyageChangeReason('   ')).toThrow(new IsRequired('Voyage change reason'))
  expect(
    () => new VoyageChangeReason(` ${'a'.repeat(maximumVoyageChangeReasonLength + 1)} `)
  ).toThrow(VoyageChangeReasonTooLong)
})
