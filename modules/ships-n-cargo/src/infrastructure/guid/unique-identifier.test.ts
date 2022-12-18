import { expect, test } from '@jest/globals'
import { UniqueIdentifier } from './unique-identifier'

test('construct class object with date', () => {
  expect(new UniqueIdentifier(new Date())).toBeTruthy()
})

test('construct class object without any param', () => {
  expect(new UniqueIdentifier()).toBeTruthy()
})

test('toString() output', () => {
  const uniqueIdentifier = new UniqueIdentifier()
  const guid = uniqueIdentifier.toString()
  expect(guid).toBeTruthy()
  expect(guid.length).toEqual(27)
})

test('date is equal to the date passed in the constructor', () => {
  const date = new Date('2022-12-17T03:40:29.204Z')
  const dateWithoutMilliseconds = new Date('2022-12-17T03:40:29.000Z')
  const uniqueIdentifier = new UniqueIdentifier(date)
  expect(uniqueIdentifier.date()).toEqual(dateWithoutMilliseconds)
})

test('object 1 greater than object 2', () => {
  const uniqueIdentifier1 = new UniqueIdentifier(new Date('2022-12-17T03:40:29.204Z'))
  const uniqueIdentifier2 = new UniqueIdentifier(new Date('2022-12-17T03:40:28.000Z'))
  expect(uniqueIdentifier1.compare(uniqueIdentifier2)).toBeGreaterThan(0)
  expect(uniqueIdentifier1.equals(uniqueIdentifier2)).toBeFalsy()
})

test('object 1 lesser than object 2', () => {
  const uniqueIdentifier1 = new UniqueIdentifier(new Date('2022-12-17T03:40:29.204Z'))
  const uniqueIdentifier2 = new UniqueIdentifier(new Date('2022-12-17T03:40:30.000Z'))
  expect(uniqueIdentifier1.compare(uniqueIdentifier2)).toBeLessThan(0)
  expect(uniqueIdentifier1.equals(uniqueIdentifier2)).toBeFalsy()
})

test('same date does not mean both objects are equal', () => {
  const uniqueIdentifier1 = new UniqueIdentifier(new Date('2022-12-17T03:40:29.204Z'))
  const uniqueIdentifier2 = new UniqueIdentifier(new Date('2022-12-17T03:40:29.204Z'))
  expect(uniqueIdentifier1.compare(uniqueIdentifier2)).not.toEqual(0)
  expect(uniqueIdentifier1.equals(uniqueIdentifier2)).toBeFalsy()
})

test('both objects are equal if they refer to the same object', () => {
  const uniqueIdentifier = new UniqueIdentifier(new Date('2022-12-17T03:40:29.204Z'))
  expect(uniqueIdentifier.compare(uniqueIdentifier)).toEqual(0)
  expect(uniqueIdentifier.equals(uniqueIdentifier)).toBeTruthy()
})
