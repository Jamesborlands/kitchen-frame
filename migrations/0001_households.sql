-- Households: one row per family; everything else is scoped to a household.
CREATE TABLE households (
  id TEXT PRIMARY KEY,                -- slug, e.g. "ludlow"
  name TEXT NOT NULL,
  pin_hash TEXT,                      -- sha256 of SESSION_SECRET + PIN (null: no family-page login yet)
  wa_phone_number_id TEXT UNIQUE,     -- the household's WhatsApp number (Meta phone number id)
  settings TEXT NOT NULL DEFAULT '{}',-- JSON, sanitized on read and write (lib/households/settings)
  created_at INTEGER NOT NULL
);

-- A frame authenticates with its own key; only the hash is kept.
CREATE TABLE frames (
  key_hash TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  label TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  url TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT '',
  sender_override TEXT,               -- "who sent this?" from the family page
  caption TEXT,
  at INTEGER NOT NULL,
  wa_from TEXT,                       -- never sent to a browser or frame
  wa_message_id TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,                 -- in the bin
  purged INTEGER NOT NULL DEFAULT 0,  -- bin emptied, bytes deleted
  loved_at INTEGER
);
CREATE INDEX photos_by_household ON photos(household_id, at DESC);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  text TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX notes_by_household ON notes(household_id, at DESC);

CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL,
  done_at INTEGER
);
CREATE INDEX todos_by_household ON todos(household_id, at);

-- Who sent what, kept after the board's 24 h.
CREATE TABLE log (
  id TEXT NOT NULL,
  household_id TEXT NOT NULL REFERENCES households(id),
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,                 -- photo | note
  from_name TEXT NOT NULL DEFAULT '',
  text TEXT,
  url TEXT,
  PRIMARY KEY (household_id, kind, id)
);
CREATE INDEX log_by_household ON log(household_id, at DESC);
