#!/bin/bash
set -e

echo "🚀 QVOR Deploy started"

cd /var/www/qvor

# Загружаем переменные окружения
if [ -f .env.local ]; then
  set -a; . .env.local; set +a
elif [ -f .env ]; then
  set -a; . .env; set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set"
  exit 1
fi

# ─── Swap 2GB (постоянный) ───────────────────────────────────────────────────
SWAP_FILE="/swapfile"
if ! swapon --show | grep -q "$SWAP_FILE"; then
  echo "💾 Creating 2GB swap..."
  fallocate -l 2G "$SWAP_FILE" 2>/dev/null || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=none
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE" -q
  swapon "$SWAP_FILE"
  grep -q "$SWAP_FILE" /etc/fstab || echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
  echo "✓ Swap 2GB enabled permanently"
else
  echo "✓ Swap already active"
fi
# ─────────────────────────────────────────────────────────────────────────────

echo "📦 Pulling latest changes..."
git pull origin main

echo "📥 Installing dependencies..."
npm ci

echo "🗄️ Running DB migrations..."
npx prisma generate
npx prisma migrate deploy

echo "🗄️ Running custom SQL migrations..."
psql "$DATABASE_URL" -c "
  CREATE TABLE IF NOT EXISTS _custom_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
  );
"
for f in prisma/migrations/*.sql; do
  name=$(basename "$f")
  applied=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM _custom_migrations WHERE name='$name'")
  if [ "$applied" != "1" ]; then
    echo "  → Applying $name"
    psql "$DATABASE_URL" -f "$f"
    psql "$DATABASE_URL" -c "INSERT INTO _custom_migrations (name) VALUES ('$name')"
  else
    echo "  ✓ Already applied: $name"
  fi
done

echo "🔨 Building..."
# Останавливаем приложение перед сборкой чтобы освободить память
pm2 stop qvor 2>/dev/null || true
pm2 stop qvor-bot 2>/dev/null || true
npm run build

mkdir -p logs data

echo "♻️ Reloading app..."
pm2 reload qvor --update-env || pm2 start ecosystem.config.js --only qvor

echo "🤖 Restarting bot..."
pm2 restart qvor-bot --update-env || pm2 start ecosystem.config.js --only qvor-bot

echo "🔌 Restarting WS signaling server..."
pm2 restart qvor-ws --update-env || pm2 start ecosystem.config.js --only qvor-ws

pm2 save

echo "✅ Deploy complete!"
pm2 status
