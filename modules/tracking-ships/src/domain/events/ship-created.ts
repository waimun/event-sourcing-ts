import { BaseDomainEvent } from './domain-event'

export class ShipCreated extends BaseDomainEvent {
  name: string

  constructor (aggregateId: string, name: string) {
    super(ShipCreated.name, aggregateId)
    this.name = name
  }

  payload (): string {
    const payload = JSON.parse(this.basePayload)
    payload.name = this.name
    return JSON.stringify(payload)
  }

  static handlePayload (): Function {
    return (payload: string): ShipCreated => {
      const { aggregateId, name } = JSON.parse(payload)
      return new ShipCreated(aggregateId, name)
    }
  }
}
