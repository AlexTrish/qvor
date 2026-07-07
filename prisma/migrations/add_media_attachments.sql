-- Медиа вложения в сообщениях
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'image' | 'video' | 'file'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_name TEXT; -- оригинальное имя файла
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_size INT;  -- размер в байтах

CREATE INDEX IF NOT EXISTS idx_messages_media ON messages(media_url) WHERE media_url IS NOT NULL;
