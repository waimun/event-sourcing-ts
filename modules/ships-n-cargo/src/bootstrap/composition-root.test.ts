import { expect, test } from 'vitest'
import { createDefaultApplication } from './composition-root'

test('assembles an application with production adapters', () => {
  expect(createDefaultApplication()).toBeDefined()
})
