import type { Id } from '../../shared/domain/id'
import type { Port } from '../port'
import type { VoyageChangeReason } from '../voyage-change-reason'

export class ChangeVoyageDestination {
  readonly id: string
  readonly destination: Port
  readonly reason: string

  constructor(id: Id, destination: Port, reason: VoyageChangeReason) {
    this.id = id.value
    this.destination = destination
    this.reason = reason.value
  }
}
