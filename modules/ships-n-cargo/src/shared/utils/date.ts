import { trim } from './text'

export const isDate = (date: string): boolean => {
  const d = new Date(trim(date))
  return d.toString() !== 'Invalid Date'
}
