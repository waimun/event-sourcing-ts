import { expect, test } from '@jest/globals'
import { Name, NameNotAllowed } from './name'
import { IsRequired } from './errors/is-required'

test('empty name', () => {
  expect(() => new Name('')).toThrow(IsRequired)
})

test('name with whitespaces', () => {
  expect(() => new Name('   ')).toThrow(IsRequired)
})

test('invalid name', () => {
  expect(() => new Name('abc!')).toThrow(NameNotAllowed)
})
