export const isObject = (value: any): boolean => typeof value === 'object' && value !== null && !Array.isArray(value)

export const isNotObject = (value: any): boolean => !isObject(value)
