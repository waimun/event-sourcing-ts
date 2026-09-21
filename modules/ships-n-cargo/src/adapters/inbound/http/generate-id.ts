import { uuidv7obj } from 'uuidv7'

export const generateId = (): string => uuidv7obj().toHex()
