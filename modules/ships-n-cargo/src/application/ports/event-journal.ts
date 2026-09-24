export interface EventStream<V> {
  readonly events: readonly V[]
  readonly version: number
}

export interface EventJournal<K, V> {
  append: (id: K, expectedVersion: number, events: readonly V[]) => Promise<void>
  eventsByAggregate: (id: K) => Promise<EventStream<V>>
}
