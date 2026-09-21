export interface EventJournal<K, V> {
  append: (...events: V[]) => Promise<void>
  eventsByAggregate: (id: K) => Promise<V[]>
}
