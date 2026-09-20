import { expect, test } from 'vitest'
import { IsRequired } from './errors/is-required'
import { Id, IdNotAllowed } from './id'

test('empty id', () => {
  expect(() => new Id('')).toThrow(IsRequired)
})

test('id with whitespaces', () => {
  expect(() => new Id('   ')).toThrow(IsRequired)
})

test('invalid id', () => {
  expect(() => new Id('a!')).toThrow(IdNotAllowed)
})
