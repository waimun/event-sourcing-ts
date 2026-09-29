CREATE TABLE event_journal (
  aggregate_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  event_payload TEXT NOT NULL,
  PRIMARY KEY (aggregate_id, version)
) STRICT;
