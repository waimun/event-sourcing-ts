import { expect, test } from '@jest/globals'
import { InvalidDate, ISODate } from './date'
import { isDate } from '../utils/date'

test('empty string', () => {
  expect(() => new ISODate('')).toThrow(InvalidDate)
})

test('whitespaces', () => {
  expect(() => new ISODate('   ')).toThrow(InvalidDate)
})

test('not parseable as date', () => {
  expect(() => new ISODate('abc')).toThrow(InvalidDate)
})

test('undefined will default to current date', () => {
  const date = new ISODate()
  expect(date).toBeDefined()
  expect(date.value).toBeInstanceOf(Date)
  expect(isDate(date.value.toISOString())).toBeTruthy()
})

test('valid date string', () => {
  const date = new ISODate('2022-12-29T03:38:47.028Z')
  expect(date).toBeDefined()
  expect(date.value).toBeInstanceOf(Date)
  expect(isDate(date.value.toISOString())).toBeTruthy()
})
