#!/bin/bash
set -e

# Запускать от root на чистом Ubuntu 22.04
echo "🛠️ QVOR Server Setup"

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PM2
npm install -g pm2
pm2 startup systemd -u www-data --hp /var/www

# Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# PostgreSQL
apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER qvor WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE qvor OWNER qvor;"

# Redis
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Директория проекта
mkdir -p /var/www/qvor
chown -R www-data:www-data /var/www/qvor

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. git clone your-repo /var/www/qvor"
echo "  2. cp .env.example .env.local && nano .env.local"
echo "  3. bash scripts/deploy.sh"
echo "  4. cp nginx.conf /etc/nginx/sites-available/qvor"
echo "  5. ln -s /etc/nginx/sites-available/qvor /etc/nginx/sites-enabled/"
echo "  6. certbot --nginx -d your-domain.com"
echo "  7. nginx -t && systemctl reload nginx"
