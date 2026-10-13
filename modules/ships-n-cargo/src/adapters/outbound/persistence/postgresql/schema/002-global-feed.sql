-- A version-one journal must be empty. The required column makes a non-empty
-- table fail and roll back instead of assigning an invented order.
ALTER TABLE ships_n_cargo.event_journal
  ADD COLUMN global_position BIGINT NOT NULL;

ALTER TABLE ships_n_cargo.event_journal
  ADD CONSTRAINT event_journal_global_position_unique UNIQUE (global_position),
  ADD CONSTRAINT event_journal_global_position_positive CHECK (global_position > 0);

CREATE TABLE ships_n_cargo.event_journal_position (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE,
  next_position BIGINT NOT NULL,
  CONSTRAINT event_journal_position_singleton CHECK (singleton),
  CONSTRAINT event_journal_next_position_positive CHECK (next_position > 0)
);

INSERT INTO ships_n_cargo.event_journal_position (singleton, next_position)
VALUES (TRUE, 1);
