-- Системный пользователь QVOR Bot
-- Фиксированный UUID, не может войти (нет пароля/телефона), только отправляет сообщения

INSERT INTO users (
  id,
  numeric_id,
  phone_hash,
  password_hash,
  blob,
  blob_recovery,
  recovery_hint,
  public_key,
  username,
  display_name,
  is_online,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  100000,
  'system:qvor',
  'system:no-login',
  'system',
  'system',
  'system',
  'system',
  'qvor',
  'QVOR',
  true,
  'SUPER_ADMIN',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Сбрасываем autoincrement чтобы обычные пользователи начинались с 100001
SELECT setval(pg_get_serial_sequence('users', 'numeric_id'), GREATEST(100001, (SELECT MAX(numeric_id) FROM users)));
