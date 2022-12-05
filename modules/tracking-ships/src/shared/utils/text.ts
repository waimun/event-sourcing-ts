export const isEmptyString = (text: string): boolean => trim(text).length === 0

export const trim = (text: string): string => (text ?? '').trim()
