import { expect, test } from 'vitest'
import { IsRequired } from './errors/is-required'
import { Name, NameNotAllowed } from './name'

test('empty name', () => {
  expect(() => new Name('')).toThrow(IsRequired)
})

test('name with whitespaces', () => {
  expect(() => new Name('   ')).toThrow(IsRequired)
})

test('invalid name', () => {
  expect(() => new Name('abc!')).toThrow(NameNotAllowed)
})
