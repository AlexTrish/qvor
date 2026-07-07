-- Таблица жалоб
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Цель жалобы
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'channel', 'message')),
  target_id TEXT NOT NULL,
  -- Причина
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'illegal_content', 'csam', 'terrorism',
    'fraud', 'malware', 'copyright', 'misinformation', 'other'
  )),
  comment TEXT,
  -- Статус
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  -- Решение модератора
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  moderator_note TEXT,
  action_taken TEXT, -- 'warned' | 'banned' | 'deleted' | 'none'
  -- Временные метки
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Уникальность: один пользователь — одна жалоба на одну цель
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique
  ON reports(reporter_id, target_type, target_id)
  WHERE status IN ('pending', 'reviewing');
