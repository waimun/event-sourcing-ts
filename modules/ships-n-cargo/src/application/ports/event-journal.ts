export interface EventStream<V> {
  readonly events: readonly V[]
  readonly version: number
}

export type GlobalPosition = bigint

export interface PositionedEvent<K, V> {
  readonly aggregateId: K
  readonly event: V
  readonly position: GlobalPosition
  readonly streamVersion: number
}

export interface EventJournal<K, V> {
  append: (id: K, expectedVersion: number, events: readonly V[]) => Promise<void>
  eventsByAggregate: (id: K) => Promise<EventStream<V>>
}

export interface GlobalEventFeed<K, V> {
  globalEventsAfter: (
    position: GlobalPosition,
    batchSize: number
  ) => Promise<readonly PositionedEvent<K, V>[]>
  globalHeadPosition: () => Promise<GlobalPosition>
}
