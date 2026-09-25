export interface PortSummary {
  readonly name: string
  readonly country: string
}

interface HistoricalEntry {
  readonly occurredAt: string
}

export interface ShipRegisteredHistoryEntry extends HistoricalEntry {
  readonly kind: 'ship-registered'
  readonly name: string
  readonly port: PortSummary
}

export interface ShipArrivedHistoryEntry extends HistoricalEntry {
  readonly kind: 'ship-arrived'
  readonly port: PortSummary
}

export interface ShipDepartedHistoryEntry extends HistoricalEntry {
  readonly kind: 'ship-departed'
}

export interface VoyagePlannedHistoryEntry extends HistoricalEntry {
  readonly kind: 'voyage-planned'
  readonly origin: PortSummary
  readonly destination: PortSummary
}

export interface ContainerHistoryEntry extends HistoricalEntry {
  readonly kind: 'container-loaded' | 'container-unloaded'
  readonly containerId: string
  readonly cargoReference: string
  readonly description: string
}

export type ShipHistoryEntry =
  | ShipRegisteredHistoryEntry
  | ShipArrivedHistoryEntry
  | ShipDepartedHistoryEntry
  | VoyagePlannedHistoryEntry
  | ContainerHistoryEntry

export interface ShipHistory {
  readonly shipId: string
  readonly history: readonly ShipHistoryEntry[]
}

export interface ShipHistoryProjection {
  historyFor: (shipId: string) => Promise<ShipHistory | undefined>
}
