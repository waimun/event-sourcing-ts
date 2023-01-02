import { test, expect } from '@jest/globals'
import { CreateShip } from './create-ship'
import { Name, NameNotAllowed } from '../../shared/domain/name'
import { Id, IdNotAllowed } from '../../shared/domain/id'
import { IsRequired } from '../../shared/domain/errors/is-required'

test('empty name', () => {
  expect(() => new CreateShip(new Name(''), new Id('123'))).toThrow(IsRequired)
})

test('name with 3 whitespaces', () => {
  // evaluates to empty string
  expect(() => new CreateShip(new Name('   '), new Id('123'))).toThrow(IsRequired)
})

test('name with leading and trailing space', () => {
  // evaluates to 'a' after spaces trimmed
  expect(() => new CreateShip(new Name(' a '), new Id('123'))).toThrow(NameNotAllowed)
})

test('name with dashes', () => {
  const result = new CreateShip(new Name('king-roy'), new Id('123'))
  expect(result).toBeTruthy()
  expect(result.name).toEqual('king-roy')
})

test('name with underscores', () => {
  const result = new CreateShip(new Name('king_roy'), new Id('123'))
  expect(result).toBeTruthy()
  expect(result.name).toEqual('king_roy')
})

test('name with spaces', () => {
  const result = new CreateShip(new Name('king roy'), new Id('123'))
  expect(result).toBeTruthy()
  expect(result.name).toEqual('king roy')
})

test('name with invalid chars', () => {
  expect(() => new CreateShip(new Name('&^*'), new Id('123'))).toThrow(NameNotAllowed)
})

test('name < 3 chars', () => {
  expect(() => new CreateShip(new Name('xy'), new Id('123'))).toThrow(NameNotAllowed)
})

test('name > 50 chars', () => {
  expect(() =>
    new CreateShip(new Name('Vl8PlucvE0g6PtFbejhqQ8TFmlqXtsAPzJER6LOIuFAoyNTGaxy'), new Id('123'))
  ).toThrow(NameNotAllowed)
})

test('empty id', () => {
  expect(() => new CreateShip(new Name('king-roy'), new Id(''))).toThrow(IsRequired)
})

test('id with 2 whitespaces', () => {
  // evaluates to empty string
  expect(() => new CreateShip(new Name('king-roy'), new Id('  '))).toThrow(IsRequired)
})

test('id = 1 char', () => {
  const result = new CreateShip(new Name('king-roy'), new Id('x'))
  expect(result).toBeTruthy()
  expect(result.id).toEqual('x')
})

test('id > 36 chars', () => {
  expect(() =>
    new CreateShip(new Name('king-roy'), new Id('XA9Kd2nIpBc2LhoWpIjRAQf9OWrgNoaPIJrox'))
  ).toThrow(IdNotAllowed)
})

test('id with dashes', () => {
  const result = new CreateShip(new Name('king-roy'), new Id('king-1'))
  expect(result).toBeTruthy()
  expect(result.id).toEqual('king-1')
})

test('id with underscores', () => {
  expect(() => new CreateShip(new Name('king-roy'), new Id('king_1'))).toThrow(IdNotAllowed)
})
