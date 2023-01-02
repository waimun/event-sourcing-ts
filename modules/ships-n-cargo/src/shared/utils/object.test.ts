import { expect, test } from '@jest/globals'
import { isObject } from './object'

test('value is object', () => {
  expect(isObject({})).toBeTruthy()
})

test('value is array', () => {
  expect(isObject([])).toBeFalsy()
})

test('value is null', () => {
  expect(isObject(null)).toBeFalsy()
})

test('value is undefined', () => {
  expect(isObject(undefined)).toBeFalsy()
})

test('value is number', () => {
  expect(isObject(123)).toBeFalsy()
})

test('value is boolean', () => {
  expect(isObject(true)).toBeFalsy()
})

test('value is string', () => {
  expect(isObject('hello')).toBeFalsy()
})
