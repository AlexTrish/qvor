-- Migration: add_friendship_banner_photos_lastseen
-- Apply with: psql $DATABASE_URL -f prisma/migrations/add_friendship_banner.sql

-- 1. last_seen_at на users (если ещё нет)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 2. banner_config на users
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_config TEXT;

-- 3. Таблица photos
CREATE TABLE IF NOT EXISTS photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_url    TEXT        NOT NULL,
  caption     TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS photos_user_id_idx ON photos(user_id);
CREATE INDEX IF NOT EXISTS photos_created_at_idx ON photos(created_at);

-- 4. Enum для статуса дружбы
DO $$ BEGIN
  CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Таблица friendships
CREATE TABLE IF NOT EXISTS friendships (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS friendships_receiver_id_idx ON friendships(receiver_id);
