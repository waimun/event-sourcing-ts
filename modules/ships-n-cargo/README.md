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

## 🚀 Running locally

1. `npm ci` **Clean install &mdash; if ./node_modules is not present.**
2. Run `npm start` for an in-memory event journal. Set `SHIPS_N_CARGO_POSTGRESQL_URL` or
   `SHIPS_N_CARGO_SQLITE_PATH` to use the corresponding persistent adapter; setting both is
   invalid.

The API listens at [http://localhost:3000](http://localhost:3000). Send a `GET`
request to `/` to verify that it is running.
