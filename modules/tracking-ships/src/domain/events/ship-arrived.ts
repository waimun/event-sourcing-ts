import { Port } from '../port'
import { BaseDomainEvent } from './domain-event'

export class ShipArrived extends BaseDomainEvent {
  port: Port

  constructor (aggregateId: string, port: Port, dateTime?: Date) {
    super(ShipArrived.name, aggregateId, dateTime)
    this.port = port
  }

  payload (): string {
    const payload = JSON.parse(this.basePayload)
    payload.portName = this.port.name
    payload.portCountry = this.port.country
    return JSON.stringify(payload)
  }

  static handlePayload (): Function {
    return (payload: string): ShipArrived => {
      const { aggregateId, portName, portCountry, dateTime } = JSON.parse(payload)
      return new ShipArrived(aggregateId, new Port(portName, portCountry), dateTime)
    }
  }
}
