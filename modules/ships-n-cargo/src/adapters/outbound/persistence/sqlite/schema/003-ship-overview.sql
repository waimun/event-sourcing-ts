CREATE TABLE ship_overview (
  ship_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('at-port', 'at-sea')),
  current_port_name TEXT,
  current_port_country TEXT,
  CHECK (
    (status = 'at-port' AND current_port_name IS NOT NULL AND current_port_country IS NOT NULL)
    OR
    (status = 'at-sea' AND current_port_name IS NULL AND current_port_country IS NULL)
  )
) STRICT;

CREATE INDEX ship_overview_status_idx
  ON ship_overview (status, ship_id);

CREATE INDEX ship_overview_current_port_idx
  ON ship_overview (current_port_name, current_port_country, ship_id);

CREATE TABLE ship_overview_checkpoint (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  position INTEGER NOT NULL CHECK (position >= 0)
) STRICT;

INSERT INTO ship_overview_checkpoint (singleton, position)
VALUES (1, 0);
