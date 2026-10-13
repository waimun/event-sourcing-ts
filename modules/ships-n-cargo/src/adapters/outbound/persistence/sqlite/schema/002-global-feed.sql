ALTER TABLE event_journal RENAME TO event_journal_before_global_feed;

CREATE TABLE event_journal (
  aggregate_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  global_position INTEGER NOT NULL UNIQUE CHECK (global_position > 0),
  event_payload TEXT NOT NULL,
  PRIMARY KEY (aggregate_id, version)
) STRICT;

INSERT INTO event_journal (aggregate_id, version, global_position, event_payload)
SELECT
  aggregate_id,
  version,
  ROW_NUMBER() OVER (ORDER BY aggregate_id, version),
  event_payload
FROM event_journal_before_global_feed;

DROP TABLE event_journal_before_global_feed;

CREATE TABLE event_journal_position (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  next_position INTEGER NOT NULL CHECK (next_position > 0)
) STRICT;

INSERT INTO event_journal_position (singleton, next_position)
SELECT 1, COALESCE(MAX(global_position), 0) + 1
FROM event_journal;
