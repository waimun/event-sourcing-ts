import { BaseDomainEvent } from './domain-event'
import { Port } from '../port'

export class ShipDeparted extends BaseDomainEvent {
  port: Port

  constructor (aggregateId: string, dateTime?: Date) {
    super(ShipDeparted.name, aggregateId, dateTime)
    this.port = Port.atSea()
  }

  payload (): string {
    const payload = JSON.parse(this.basePayload)
    payload.portName = this.port.name
    payload.portCountry = this.port.country
    return JSON.stringify(payload)
  }

  static handlePayload (): Function {
    return (payload: string): ShipDeparted => {
      const { aggregateId, dateTime } = JSON.parse(payload)
      return new ShipDeparted(aggregateId, dateTime)
    }
  }
}
