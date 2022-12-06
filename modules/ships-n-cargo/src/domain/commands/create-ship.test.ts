import { test, expect } from '@jest/globals'
import { CreateShip } from './create-ship'
import { NameIsRequired, NameNotAllowed } from '../../shared/validators/name'
import { IdIsRequired, IdNotAllowed } from '../../shared/validators/id'

test('empty name', () => {
  expect(() => new CreateShip('', '123')).toThrow(NameIsRequired)
})

test('name with 3 whitespaces', () => {
  // evaluates to empty string
  expect(() => new CreateShip('   ', '123')).toThrow(NameIsRequired)
})

test('name with leading and trailing space', () => {
  // evaluates to 'a' after spaces trimmed
  expect(() => new CreateShip(' a ', '123')).toThrow(NameNotAllowed)
})

test('name with dashes', () => {
  const result = new CreateShip('king-roy', '123')
  expect(result).toBeTruthy()
})

test('name with underscores', () => {
  const result = new CreateShip('king_roy', '123')
  expect(result).toBeTruthy()
})

test('name with spaces', () => {
  const result = new CreateShip('king roy', '123')
  expect(result).toBeTruthy()
})

test('name with invalid chars', () => {
  expect(() => new CreateShip('&^*', '123')).toThrow(NameNotAllowed)
})

test('name < 3 chars', () => {
  expect(() => new CreateShip('xy', '123')).toThrow(NameNotAllowed)
})

test('name > 50 chars', () => {
  expect(() => {
    const result = new CreateShip('Vl8PlucvE0g6PtFbejhqQ8TFmlqXtsAPzJER6LOIuFAoyNTGaxy', '123')
    expect(result).toBeTruthy()
  }).toThrow(NameNotAllowed)
})

test('empty id', () => {
  expect(() => new CreateShip('king-roy', '')).toThrow(IdIsRequired)
})

test('id with 2 whitespaces', () => {
  // evaluates to empty string
  expect(() => new CreateShip('king-roy', '  ')).toThrow(IdIsRequired)
})

test('id = 1 char', () => {
  const result = new CreateShip('king-roy', 'x')
  expect(result).toBeTruthy()
})

test('id > 36 chars', () => {
  expect(() => {
    const result = new CreateShip('king-roy', 'XA9Kd2nIpBc2LhoWpIjRAQf9OWrgNoaPIJrox')
    expect(result).toBeTruthy()
  }).toThrow(IdNotAllowed)
})

test('id with dashes', () => {
  const result = new CreateShip('king-roy', 'king-1')
  expect(result).toBeTruthy()
})

test('id with underscores', () => {
  expect(() => new CreateShip('king-roy', 'king_1')).toThrow(IdNotAllowed)
})
