# Event payload format and evolution

The event journal stores every domain event as a self-describing JSON envelope. This format is a
durable contract: adapters may store it differently, but they do not define or interpret it.
The governing architectural rationale is recorded in
[the versioned event payload ADR](adr/adr-20260927.md).

## Canonical version-one envelope

Every event starts with schema version one. A serialized `ShipRegistered` is:

```json
{
  "type": "ShipRegistered",
  "schemaVersion": 1,
  "aggregateId": "abc",
  "occurredAt": "2024-01-02T03:04:05.000Z",
  "recordedAt": "2024-01-03T04:05:06.000Z",
  "data": {
    "name": "King Roy",
    "port": {
      "name": "Kingston",
      "country": "US"
    }
  }
}
```

All six envelope fields are required:

| Field           | Contract                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | The stable domain-event discriminator used to select its serializer.                                                                                                       |
| `schemaVersion` | A positive integer identifying the representation of this event type. Versioning starts at `1`; an absent or invalid value is rejected and never defaults to version one.  |
| `aggregateId`   | The identifier of the aggregate that emitted the event.                                                                                                                    |
| `occurredAt`    | The event's occurrence time as an ISO 8601 string.                                                                                                                         |
| `recordedAt`    | The event's recording time as an ISO 8601 string.                                                                                                                          |
| `data`          | The event-specific representation, separate from the common envelope metadata.                                                                                             |

The `data` object follows the structure of domain values rather than flattening their properties
into the envelope. A port, for example, is represented as `{ "name", "country" }`. An event with no
event-specific values uses an empty object: `"data": {}`.

`schemaVersion` is scoped to `type`. Version two of one event says nothing about the schema of
another event. It is also unrelated to the aggregate stream position exposed by `EventJournal`.
Stream position orders an aggregate's events and supports optimistic concurrency; payload schema
version tells the reader how one event's `data` is represented.

## Ownership of the format

The responsibilities are deliberately separated:

| Component                                                                  | Responsibility                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Event-payload codec](../src/domain/events/event-payload-handler.ts)       | Parse and construct the envelope, select the event serializer, validate and route schema versions, run upcasters, and preserve envelope metadata while upcasting.  |
| [Event serializer](../src/domain/events/serializers/event-serializable.ts) | Declare an event type and its current schema version, map a current domain event to `data`, and reconstruct it from current `data` plus envelope metadata.         |
| [Event upcaster](../src/domain/events/event-upcaster.ts)                   | Purely and deterministically transform one event type's `data` from version `N` to `N + 1`.                                                                        |
| Journal adapter                                                            | Store and retrieve the codec's serialized payload as an opaque string while managing stream mechanics.                                                             |

This boundary lets a journal adapter be replaced without duplicating knowledge of event JSON. The
codec upcasts only while reading; it does not rewrite stored history. Serialization always writes
the current version declared by the event serializer, and there is no downcasting.

Event-specific representation types use `<EventName>Data` while only one representation is needed,
such as `ShipRegisteredData`. `Data` matches the envelope field and distinguishes the durable event
representation from application input types such as `RegisterShipDto`. If an event evolves and
multiple representations coexist in the code, name them `<EventName>DataV1`,
`<EventName>DataV2`, and so on.

Every production event currently remains at schema version one, and no production upcaster is
registered. The consecutive-chain mechanism is exercised with test-only event schemas in the
[event upcaster tests](../src/domain/events/event-upcaster.test.ts); those tests do not imply
fabricated production history.

## Evolving an event representation

Evolve only the event type whose stored representation must change:

1. Define the next event-specific data type. Keep the old type available to type the transformation,
   and add version suffixes to the coexisting types.
2. Increase that event serializer's `schemaVersion` by one. Make `toData` emit the new shape and
   make `toEvent` consume the new shape.
3. Add an `EventUpcaster` registered for that event type whose `fromSchemaVersion` is the old version
   and whose `toSchemaVersion` is exactly the next version. Transform only `data`; the codec retains
   `type`, `aggregateId`, `occurredAt`, and `recordedAt`.
4. Keep the transformation pure and deterministic. It must not consult a database, service, clock,
   or mutable state, and it must not invent facts missing from the recorded event. If a required
   current value cannot be derived truthfully, model the historical unknown, introduce a different
   event, or make a separately justified migration decision.
5. Retain every adjacent upcaster needed to reach the current schema. A stored version must travel
   through a complete `N -> N + 1` chain; the codec fails closed when a link is absent.

For each evolution, verify that:

- serialization emits only the new current schema and never invokes upcasters;
- every retained older schema reaches the current domain event through the complete chain;
- reading begins at the stored version rather than replaying earlier transformations;
- aggregate identity and both timestamps survive upcasting unchanged;
- missing chain links, invalid or absent versions, and versions newer than the serializer are
  rejected;
- the event's semantic meaning is preserved by the transformation; and
- journal adapters continue to treat payloads as opaque strings.

## Deploy readers before new writes

Upcasting provides one-way compatibility: a new reader can consume an older representation, but an
old reader cannot consume a newer one.

A coordinated deployment must therefore prevent old readers from encountering new-version writes.
For a rolling deployment, first deploy readers that understand the new version while writes remain
on the old version. Only after no old readers remain may writers begin emitting the new version.
That compatibility phase requires a separate write-version gate or equivalent rollout mechanism.

This repository does not implement that deployment mechanism. Its serializer's current version is
also the version used for new writes, so merely registering an upcaster is not a two-phase rollout
strategy. A real project must choose a gate, feature flag, traffic boundary, or coordinated release
appropriate to its topology before changing the emitted version.
