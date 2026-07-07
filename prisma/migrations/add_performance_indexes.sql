-- Индекс для GET /api/conversations — DISTINCT ON (peer_id) по sender/receiver
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_created
  ON messages (sender_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_created
  ON messages (receiver_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Составной индекс для диалогов (sender+receiver пара)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conv_pair
  ON messages (sender_id, receiver_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Индекс для chat_states (правильное имя таблицы)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_states_user
  ON chat_states (user_id);

-- Индекс для notifications (поле read: boolean, не read_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id)
  WHERE read = false;

-- Индекс для channel_members (быстрый поиск каналов пользователя)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channel_members_user
  ON channel_members (user_id);
