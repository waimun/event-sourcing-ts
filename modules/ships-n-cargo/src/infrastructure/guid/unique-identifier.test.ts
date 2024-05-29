import { expect, test } from '@jest/globals'
import { Guid } from './unique-identifier'

test('construct class object without any param', () => {
  expect(new Guid()).toBeTruthy()
})

test('toString() output', () => {
  const uniqueIdentifier = new Guid()
  const guid = uniqueIdentifier.toString()
  expect(guid).toBeTruthy()
  expect(guid.length).toEqual(32)
})
