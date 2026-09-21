import { expect, test } from 'vitest'
import { generateId } from './generate-id'

test('generates distinct 32-character UUIDv7 hex identifiers', () => {
  const first = generateId()
  const second = generateId()
  expect(first).toMatch(/^[0-9a-f]{12}7[0-9a-f]{19}$/)
  expect(second).toMatch(/^[0-9a-f]{12}7[0-9a-f]{19}$/)
  expect(second).not.toBe(first)
})
