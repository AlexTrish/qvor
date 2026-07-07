-- Категория канала
ALTER TABLE channels ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
-- Закреп канала для участника
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
