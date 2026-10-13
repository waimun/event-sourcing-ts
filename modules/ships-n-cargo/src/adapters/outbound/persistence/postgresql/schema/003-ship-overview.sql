CREATE TABLE ships_n_cargo.ship_overview (
  ship_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  current_port_name TEXT,
  current_port_country TEXT,
  CONSTRAINT ship_overview_status_valid CHECK (status IN ('at-port', 'at-sea')),
  CONSTRAINT ship_overview_current_port_consistent CHECK (
    (status = 'at-port' AND current_port_name IS NOT NULL AND current_port_country IS NOT NULL)
    OR
    (status = 'at-sea' AND current_port_name IS NULL AND current_port_country IS NULL)
  )
);

CREATE INDEX ship_overview_status_idx
  ON ships_n_cargo.ship_overview (status, ship_id);

CREATE INDEX ship_overview_current_port_idx
  ON ships_n_cargo.ship_overview (current_port_name, current_port_country, ship_id);

CREATE TABLE ships_n_cargo.ship_overview_checkpoint (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE,
  position BIGINT NOT NULL,
  CONSTRAINT ship_overview_checkpoint_singleton CHECK (singleton),
  CONSTRAINT ship_overview_checkpoint_position_nonnegative CHECK (position >= 0)
);

INSERT INTO ships_n_cargo.ship_overview_checkpoint (singleton, position)
VALUES (TRUE, 0);
