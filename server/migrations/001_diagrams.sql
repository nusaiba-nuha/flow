-- One row per published diagram. The id is the public link, so it is long
-- enough not to be guessed; the edit token is kept only as a hash.
CREATE TABLE IF NOT EXISTS diagrams (
  id         text PRIMARY KEY,
  text       text NOT NULL,
  title      text NOT NULL,
  edit_hash  text NOT NULL,
  revision   integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
