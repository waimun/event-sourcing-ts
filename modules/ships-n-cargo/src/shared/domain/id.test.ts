import { expect, test } from '@jest/globals'
import { Id, IdNotAllowed } from './id'
import { IsRequired } from './errors/is-required'

test('empty id', () => {
  expect(() => new Id('')).toThrow(IsRequired)
})

test('id with whitespaces', () => {
  expect(() => new Id('   ')).toThrow(IsRequired)
})

test('invalid id', () => {
  expect(() => new Id('a!')).toThrow(IdNotAllowed)
})
