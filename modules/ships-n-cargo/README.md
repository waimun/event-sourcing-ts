# 🚢 Ships and Cargo
An experiment of event sourcing with domain driven design, CQRS, and clean architecture based on a fictitious model of ships and cargo.

![CI Status](https://github.com/waimun/event-sourcing-ts/actions/workflows/ships-n-cargo.yml/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/waimun/event-sourcing-ts/branch/main/graph/badge.svg?token=PAWBB5Z6Q4)](https://codecov.io/gh/waimun/event-sourcing-ts)

## 🏗️ Build
This module currently supports [Node.js](https://nodejs.org/en/about/releases) 24.x. Our CI [workflow](https://github.com/waimun/event-sourcing-ts/actions/workflows/ships-n-cargo.yml) reflects the supported runtime and the steps to build the module locally.

### Building locally:

1. `npm ci` **Clean install &mdash; if ./node_modules is not present.**
2. `npm run build`

### Testing

- `npm run test:unit` runs the unit suite with coverage enforcement.
- `TEST_DATABASE_URL=<connection-string> npm run test:integration` runs the PostgreSQL integration
  suite against an existing test database. The integration suite drops and recreates the
  `ships_n_cargo` schema, so do not point it at a database containing data you need.

## PostgreSQL setup

Provision a PostgreSQL database, then apply and verify the checked-in initial schema:

```sh
SHIPS_N_CARGO_DATABASE_URL=<connection-string> npm run db:setup
```

The command is safe to rerun when the schema matches. It reports an error when an existing
`ships_n_cargo.event_journal` table is incompatible. Journal rows are identified by the composite
primary key `(aggregate_id, version)`; the table does not assign a separate event identifier.

## 🚀 Running locally

1. `npm ci` **Clean install &mdash; if ./node_modules is not present.**
2. `npm start`

The API listens at [http://localhost:3000](http://localhost:3000). Send a `GET`
request to `/` to verify that it is running.
