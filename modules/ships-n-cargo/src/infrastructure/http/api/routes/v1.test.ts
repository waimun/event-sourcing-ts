import { expect, test } from 'vitest'
import { v1Router } from './v1'

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
  expect(v1Router.stack.length).toEqual(2)
})

test('contains route /', () => {
  const stack = v1Router.stack as unknown as RouteLayer[]
  const layer = findRoute(stack, '/')
  expect(layer).toBeTruthy()
  expect(layer.route.methods.get).toBeTruthy()
  expect(layer.route.stack.length).toEqual(1)
  expect(layer.route.stack[0].name).toEqual('ping')
})
