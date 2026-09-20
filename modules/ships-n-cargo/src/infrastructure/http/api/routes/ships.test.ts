import { expect, test } from '@jest/globals'
import { shipRouter } from './ships'

type RouteLayer = {
  route: {
    methods: Record<string, boolean>
    path: string
    stack: Array<{ name: string }>
  }
}

const findRoute = (stack: RouteLayer[], path: string): RouteLayer => {
  const layer = stack.find((layer) => layer.route.path === path)
  if (layer === undefined) throw new Error(`Route ${path} not found`)
  return layer
}

test('layers count', () => {
  expect(shipRouter.stack.length).toEqual(5)
})

test('contains route /create', () => {
  const stack = shipRouter.stack as unknown as RouteLayer[]
  const layer = findRoute(stack, '/create')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('createShip')
})

test('contains route /dock', () => {
  const stack = shipRouter.stack as unknown as RouteLayer[]
  const layer = findRoute(stack, '/dock')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('dockShip')
})

test('contains route /sail', () => {
  const stack = shipRouter.stack as unknown as RouteLayer[]
  const layer = findRoute(stack, '/sail')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('sailShip')
})

test('contains route /load-cargo', () => {
  const stack = shipRouter.stack as unknown as RouteLayer[]
  const layer = findRoute(stack, '/load-cargo')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('loadCargo')
})

test('contains route /unload-cargo', () => {
  const stack = shipRouter.stack as unknown as RouteLayer[]
  const layer = findRoute(stack, '/unload-cargo')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.post).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('unloadCargo')
})
