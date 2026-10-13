ALTER TABLE ships_n_cargo.event_journal
  ADD COLUMN global_position BIGINT;

WITH positioned_events AS (
  SELECT
    journal.aggregate_id,
    journal.version,
    ROW_NUMBER() OVER (ORDER BY journal.aggregate_id, journal.version) AS global_position
  FROM ships_n_cargo.event_journal AS journal
)
UPDATE ships_n_cargo.event_journal AS journal
SET global_position = positioned_events.global_position
FROM positioned_events
WHERE journal.aggregate_id = positioned_events.aggregate_id
  AND journal.version = positioned_events.version;

ALTER TABLE ships_n_cargo.event_journal
  ALTER COLUMN global_position SET NOT NULL,
  ADD CONSTRAINT event_journal_global_position_unique UNIQUE (global_position),
  ADD CONSTRAINT event_journal_global_position_positive CHECK (global_position > 0);

CREATE TABLE ships_n_cargo.event_journal_position (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE,
  next_position BIGINT NOT NULL,
  CONSTRAINT event_journal_position_singleton CHECK (singleton),
  CONSTRAINT event_journal_next_position_positive CHECK (next_position > 0)
);

INSERT INTO ships_n_cargo.event_journal_position (singleton, next_position)
SELECT TRUE, COALESCE(MAX(journal.global_position), 0) + 1
FROM ships_n_cargo.event_journal AS journal;
