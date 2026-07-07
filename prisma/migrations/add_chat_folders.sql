-- Chat folders
CREATE TABLE IF NOT EXISTS chat_folders (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  emoji            TEXT,
  position         INT NOT NULL DEFAULT 0,
  filter_unread    BOOLEAN NOT NULL DEFAULT false,
  filter_channels  BOOLEAN NOT NULL DEFAULT false,
  filter_contacts  BOOLEAN NOT NULL DEFAULT false,
  filter_groups    BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_folders_user_id ON chat_folders(user_id);

-- Chat folder entries
CREATE TABLE IF NOT EXISTS chat_folder_entries (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  folder_id   TEXT NOT NULL REFERENCES chat_folders(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  peer_id     TEXT NOT NULL,
  peer_type   TEXT NOT NULL DEFAULT 'user',
  pinned      BOOLEAN NOT NULL DEFAULT false,
  pinned_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(folder_id, peer_id)
);
CREATE INDEX IF NOT EXISTS chat_folder_entries_folder_id ON chat_folder_entries(folder_id);

-- Chat states (archive, pin, unread)
CREATE TABLE IF NOT EXISTS chat_states (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peer_id      TEXT NOT NULL,
  peer_type    TEXT NOT NULL DEFAULT 'user',
  archived     BOOLEAN NOT NULL DEFAULT false,
  pinned       BOOLEAN NOT NULL DEFAULT false,
  pinned_at    TIMESTAMPTZ,
  unread_count INT NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, peer_id)
);
CREATE INDEX IF NOT EXISTS chat_states_user_id ON chat_states(user_id);
