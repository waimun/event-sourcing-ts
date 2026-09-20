export const isObject = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isNotObject = (value: unknown): boolean => !isObject(value)
