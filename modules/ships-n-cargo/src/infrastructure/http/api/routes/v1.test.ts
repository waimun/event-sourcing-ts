import { expect, test } from '@jest/globals'
import { v1Router } from './v1'

test('layers count', () => {
  expect(v1Router.stack.length).toEqual(2)
})

test('contains route /', () => {
  const stack: any[] = v1Router.stack
  const layer = stack.find(layer => layer.route.path === '/')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.get).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('ping')
})
