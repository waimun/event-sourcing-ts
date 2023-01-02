import { expect, test } from '@jest/globals'
import { isDate } from './date'

test('valid date string', () => {
  expect(isDate('2022-12-29T03:38:47.028Z')).toBeTruthy()
})

test('invalid date string', () => {
  expect(isDate('abc')).toBeFalsy()
})
