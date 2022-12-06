import { expect, test } from '@jest/globals'
import { trim } from './text'

test('trim with undefined value', () => {
  // @ts-expect-error
  expect(trim(undefined)).toEqual('')
})

test('trim with null value', () => {
  // @ts-expect-error
  expect(trim(null)).toEqual('')
})
