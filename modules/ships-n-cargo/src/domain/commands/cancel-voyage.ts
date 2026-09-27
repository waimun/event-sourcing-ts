import type { Id } from '../../shared/domain/id'
import type { VoyageChangeReason } from '../voyage-change-reason'

export class CancelVoyage {
  readonly id: string
  readonly reason: string

  constructor(id: Id, reason: VoyageChangeReason) {
    this.id = id.value
    this.reason = reason.value
  }
}
