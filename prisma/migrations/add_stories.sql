-- Stories
CREATE TABLE IF NOT EXISTS stories (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_url    TEXT NOT NULL,
  caption     TEXT,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stories_user_id    ON stories(user_id);
CREATE INDEX IF NOT EXISTS stories_expires_at ON stories(expires_at);

-- Story views
CREATE TABLE IF NOT EXISTS story_views (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  story_id   TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Update photos caption to NOT NULL with default
ALTER TABLE photos ALTER COLUMN caption SET DEFAULT '';
UPDATE photos SET caption = '' WHERE caption IS NULL;
