import type { GlobalPosition } from './event-journal'

export type ShipOverviewStatus = 'at-port' | 'at-sea'

export interface ShipOverviewPort {
  readonly country: string
  readonly name: string
}

export interface ShipOverview {
  readonly currentPort?: ShipOverviewPort
  readonly name: string
  readonly shipId: string
  readonly status: ShipOverviewStatus
}

export interface ShipOverviewProjectionBatch {
  readonly checkpoint: GlobalPosition
  readonly projectedEventCount: number
}

export interface ShipOverviewProjection {
  projectNextBatch: (batchSize: number) => Promise<ShipOverviewProjectionBatch>
}

export interface RebuildableShipOverviewProjection extends ShipOverviewProjection {
  resetForRebuild: () => Promise<void>
}

export type ShipOverviewFilter =
  | { readonly status: ShipOverviewStatus }
  | { readonly currentPort: ShipOverviewPort }

export interface ShipOverviewQueries {
  overviewFor: (shipId: string) => Promise<ShipOverview | undefined>
  overviewsMatching: (filter: ShipOverviewFilter) => Promise<readonly ShipOverview[]>
}
