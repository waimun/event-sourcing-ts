import { Name } from '../shared/domain/name'

export class PortName extends Name {
  constructor (value: string) {
    super(value, 'Port name')
  }
}
