import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const productionTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return productionTypeScriptFiles(path)
    return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
      ? [path]
      : []
  })

test('every explicitly thrown production error belongs to the typed kernel', () => {
  const sources = productionTypeScriptFiles(sourceRoot).map((path) => ({
    path,
    text: readFileSync(path, 'utf8')
  }))
  const parentByClass = new Map<string, string>()

  for (const { text } of sources) {
    for (const match of text.matchAll(/class\s+(\w+)\s+extends\s+(\w+)/g)) {
      parentByClass.set(match[1], match[2])
    }
  }

  const belongsToKernel = (className: string): boolean => {
    const visited = new Set<string>()
    let current: string | undefined = className

    while (current !== undefined && !visited.has(current)) {
      if (current === 'BaseError') return true
      visited.add(current)
      current = parentByClass.get(current)
    }

    return false
  }

  const violations = sources.flatMap(({ path, text }) =>
    [...text.matchAll(/throw\s+new\s+(\w+)/g)]
      .map((match) => match[1])
      .filter((className) => !belongsToKernel(className))
      .map((className) => `${path}: ${className}`)
  )

  expect(violations).toEqual([])
})

test('only the typed kernel extends a native error class', () => {
  const nativeErrors = [
    'Error',
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError'
  ]
  const violations = productionTypeScriptFiles(sourceRoot).flatMap((path) => {
    const text = readFileSync(path, 'utf8')

    return [...text.matchAll(/class\s+(\w+)\s+extends\s+(\w+)/g)]
      .filter(([, className, parent]) => nativeErrors.includes(parent) && className !== 'BaseError')
      .map(([, className, parent]) => `${path}: ${className} extends ${parent}`)
  })

  expect(violations).toEqual([])
})
