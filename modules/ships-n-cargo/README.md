# 🚢 Ships and Cargo
An experiment of event sourcing with domain-driven design, CQRS, and clean architecture based on a fictitious model of ships and cargo.

![CI Status](https://github.com/waimun/event-sourcing-ts/actions/workflows/ships-n-cargo.yml/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/waimun/event-sourcing-ts/branch/main/graph/badge.svg?token=PAWBB5Z6Q4)](https://codecov.io/gh/waimun/event-sourcing-ts)

## 🏗️ Build
This module currently supports [Node.js](https://nodejs.org/en/about/releases) 24.x. The CI [workflow](https://github.com/waimun/event-sourcing-ts/actions/workflows/ships-n-cargo.yml) reflects the supported runtime and the steps to build the module locally.

### Building locally:

1. `npm ci` **Clean install &mdash; if ./node_modules is not present.**
2. `npm run build`

### Testing notes

- `npm run build` includes the unit suite with coverage enforcement; use `npm test` to run it
  separately.
- `TEST_POSTGRESQL_URL='postgresql://<user>:<password>@<host>:<port>/<database>' npm run test:integration`
  runs the database integration suite. Its PostgreSQL tests use the existing test database and
  drop and recreate the `ships_n_cargo` schema, so do not point it at a database containing data
  you need. Its SQLite tests create their own temporary databases.

## 🐘 PostgreSQL setup (optional)

Provision a PostgreSQL database, then apply and verify its pending schema migrations:

```sh
SHIPS_N_CARGO_POSTGRESQL_URL='postgresql://<user>:<password>@<host>:<port>/<database>' npm run db:setup
```

The application applies the same pending migrations during startup, so this command is only needed
to prepare the database separately. It is safe to rerun and reports an error when the resulting
`ships_n_cargo.event_journal` table is incompatible.

## 🪶 SQLite setup (optional)

SQLite uses the built-in Node.js 24 SQLite module and applies its pending schema migrations
automatically. Provide a file path when starting the application:

```sh
SHIPS_N_CARGO_SQLITE_PATH='./ships-n-cargo.sqlite' npm start
```

## ♻️ Rebuilding the ship overview

The ship overview is disposable derived data. Rebuild it from the complete event journal by setting
exactly one persistent database and running the operator command:

```sh
SHIPS_N_CARGO_POSTGRESQL_URL='postgresql://<user>:<password>@<host>:<port>/<database>' npm run projection:rebuild-ship-overview
```

```sh
SHIPS_N_CARGO_SQLITE_PATH='./ships-n-cargo.sqlite' npm run projection:rebuild-ship-overview
```

The command clears the overview and resets its checkpoint before replaying the same event handlers
used by continuous projection. It is safe to rerun, including when the journal or projection is
empty. Overview queries can return incomplete results while the replay is running, so stop the
application or otherwise remove read traffic from every instance when a consistent view is needed
throughout the rebuild. Command handling and journal-backed ship-history reads do not depend on the
overview.

## 📊 Projection consistency and lag

Commands commit events to the journal before the ship overview processes them. The overview
endpoints are therefore eventually consistent: immediately after a successful command they may
briefly return the previous state. The background projector reads bounded batches and resumes from
its durable checkpoint after a restart. PostgreSQL also locks that checkpoint while applying a
batch, so multiple application instances cooperate rather than applying the same batch concurrently.

Projection lag is the journal's current head position minus the ship-overview checkpoint. A lag of
zero means the overview has processed every committed event visible at the time of the query. The
value counts journal events, not elapsed time; events that do not change an overview still advance
its checkpoint. Inspect persistent environments with the corresponding query:

```sql
-- PostgreSQL
SELECT journal.head_position,
       checkpoint.position AS checkpoint_position,
       journal.head_position - checkpoint.position AS lag
FROM (
  SELECT COALESCE(MAX(global_position), 0)::bigint AS head_position
  FROM ships_n_cargo.event_journal
) AS journal
CROSS JOIN ships_n_cargo.ship_overview_checkpoint AS checkpoint;
```

```sql
-- SQLite
SELECT journal.head_position,
       checkpoint.position AS checkpoint_position,
       journal.head_position - checkpoint.position AS lag
FROM (
  SELECT COALESCE(MAX(global_position), 0) AS head_position
  FROM event_journal
) AS journal
CROSS JOIN ship_overview_checkpoint AS checkpoint;
```

If lag remains above zero, inspect application logs for `Ship overview projection failed`. The
projector reports a failed batch, leaves its overview and checkpoint unchanged, and retries, so it
does not require a rebuild for a transient failure. Use the rebuild command when the derived data
itself must be replaced or repaired. In-memory state is intentionally ephemeral and has no durable
lag to inspect across restarts.

## 🚀 Running locally

1. `npm ci` **Clean install &mdash; if ./node_modules is not present.**
2. Run `npm start` for an in-memory event journal. Set `SHIPS_N_CARGO_POSTGRESQL_URL` or
   `SHIPS_N_CARGO_SQLITE_PATH` to use the corresponding persistent adapter; setting both is
   invalid.

The API listens at [http://localhost:3000](http://localhost:3000). Send a `GET`
request to `/` to verify that it is running. See the [OpenAPI contract](src/adapters/inbound/http/openapi.yaml)
for the available endpoints and request and response schemas.
