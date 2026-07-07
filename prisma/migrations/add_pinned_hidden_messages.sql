-- Закреплённые сообщения в диалоге (у каждого пользователя своё)
CREATE TABLE IF NOT EXISTS pinned_messages (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peer_id     TEXT NOT NULL,  -- id собеседника
  message_id  TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  pinned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, peer_id)
);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_user_peer ON pinned_messages(user_id, peer_id);

-- Удаление сообщения только у себя (скрыть, не soft-delete для всех)
CREATE TABLE IF NOT EXISTS hidden_messages (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  hidden_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_hidden_messages_user ON hidden_messages(user_id);
