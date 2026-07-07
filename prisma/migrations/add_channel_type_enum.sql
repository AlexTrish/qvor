-- Создаём enum ChannelType если не существует
DO $$ BEGIN
  CREATE TYPE "ChannelType" AS ENUM ('CHANNEL', 'GROUP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Добавляем колонку type с правильным enum типом
ALTER TABLE channels ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'CHANNEL';
