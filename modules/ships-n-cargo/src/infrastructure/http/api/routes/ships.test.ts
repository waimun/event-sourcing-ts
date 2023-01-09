import { expect, test } from '@jest/globals'
import { shipRouter } from './ships'

test('layers count', () => {
  expect(shipRouter.stack.length).toEqual(3)
})

test('contains route /create', () => {
  const stack: any[] = shipRouter.stack
  const layer = stack.find(layer => layer.route.path === '/create')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('createShip')
})

test('contains route /dock', () => {
  const stack: any[] = shipRouter.stack
  const layer = stack.find(layer => layer.route.path === '/dock')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('dockShip')
})

test('contains route /sail', () => {
  const stack: any[] = shipRouter.stack
  const layer = stack.find(layer => layer.route.path === '/sail')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('sailShip')
})
