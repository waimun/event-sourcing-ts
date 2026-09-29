# 🚢 Ships and Cargo
An experiment of event sourcing with domain-driven design, CQRS, and clean architecture based on a fictitious model of ships and cargo.

![CI Status](https://github.com/waimun/event-sourcing-ts/actions/workflows/ships-n-cargo.yml/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/waimun/event-sourcing-ts/branch/main/graph/badge.svg?token=PAWBB5Z6Q4)](https://codecov.io/gh/waimun/event-sourcing-ts)

## 🏗️ Build
This module currently supports [Node.js](https://nodejs.org/en/about/releases) 24.x. The CI [workflow](https://github.com/waimun/event-sourcing-ts/actions/workflows/ships-n-cargo.yml) reflects the supported runtime and the steps to build the module locally.

### Building locally:

1. `npm ci` **Clean install &mdash; if ./node_modules is not present.**
2. `npm run build`

### Testing

- `npm test` runs the unit suite with coverage enforcement.
- `TEST_DATABASE_URL='postgresql://<user>:<password>@<host>:<port>/<database>' npm run test:integration`
  runs the PostgreSQL integration suite against an existing test database. The integration suite
  drops and recreates the `ships_n_cargo` schema, so do not point it at a database containing data
  you need.

## 🐘 PostgreSQL setup (optional)

Provision a PostgreSQL database, then apply and verify the checked-in initial schema:

```sh
SHIPS_N_CARGO_DATABASE_URL='postgresql://<user>:<password>@<host>:<port>/<database>' npm run db:setup
```

The command is safe to rerun when the schema matches. It reports an error when an existing
`ships_n_cargo.event_journal` table is incompatible.

## 🪶 SQLite setup (optional)

SQLite uses the built-in Node.js 24 SQLite module and creates its schema automatically. Provide a
file path when starting the application:

```sh
SHIPS_N_CARGO_SQLITE_PATH='./ships-n-cargo.sqlite' npm start
```

## 🚀 Running locally

1. `npm ci` **Clean install &mdash; if ./node_modules is not present.**
2. Run `npm start` for an in-memory event journal. To choose an adapter explicitly, set
   `SHIPS_N_CARGO_EVENT_JOURNAL` to `memory`, `postgresql`, or `sqlite`. PostgreSQL also requires
   `SHIPS_N_CARGO_DATABASE_URL`, while SQLite requires `SHIPS_N_CARGO_SQLITE_PATH`. When the
   selector is omitted, either setting selects its corresponding adapter; setting both is invalid.

The API listens at [http://localhost:3000](http://localhost:3000). Send a `GET`
request to `/` to verify that it is running.
