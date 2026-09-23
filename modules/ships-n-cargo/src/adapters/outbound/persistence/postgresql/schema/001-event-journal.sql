BEGIN;

CREATE SCHEMA IF NOT EXISTS ships_n_cargo;

CREATE TABLE IF NOT EXISTS ships_n_cargo.event_journal (
  aggregate_id TEXT NOT NULL,
  version BIGINT NOT NULL,
  event_payload TEXT NOT NULL,
  CONSTRAINT event_journal_stream_position_pkey PRIMARY KEY (aggregate_id, version),
  CONSTRAINT event_journal_version_positive CHECK (version > 0)
);

COMMIT;
