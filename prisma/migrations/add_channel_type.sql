-- Добавляем тип канала: CHANNEL (публичный/приватный канал) или GROUP (группа)
ALTER TABLE channels ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'CHANNEL';
