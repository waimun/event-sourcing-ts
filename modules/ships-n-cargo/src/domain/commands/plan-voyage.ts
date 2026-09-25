import type { Id } from '../../shared/domain/id'
import type { Port } from '../port'

export class PlanVoyage {
  readonly id: string
  readonly destination: Port

  constructor(id: Id, destination: Port) {
    this.id = id.value
    this.destination = destination
  }
}
