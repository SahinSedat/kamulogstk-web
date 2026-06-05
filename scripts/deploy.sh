#!/bin/bash
# Kamulog Panel Deploy Script
set -e
echo "🚀 Kamulog Panel Deploy Başlatılıyor..."

APP_DIR="/home/kamulog/kamulogWebYonetim"
REPO="https://github.com/SahinSedat/kamulogWebYonetim.git"

# 1. Repo clone/pull
if [ -d "$APP_DIR" ]; then
    echo "📥 Güncelleniyor..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "📦 İlk kurulum..."
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# 2. Node.js
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Dependencies
echo "📦 Bağımlılıklar yükleniyor..."
npm install --production=false

# 4. Env
if [ ! -f .env ]; then
    cp .env.production .env
    echo "⚠️  .env oluşturuldu — DATABASE_URL kontrol et!"
fi

# 5. Prisma
echo "🗄️  Veritabanı şeması uygulanıyor..."
npx prisma generate
npx prisma db push --accept-data-loss

# 6. Build
echo "🔨 Production build..."
npm run build

# 7. PM2
echo "🚀 PM2 ile başlatılıyor..."
npx pm2 delete kamulog-panel 2>/dev/null || true
npx pm2 start ecosystem.config.js
npx pm2 save

echo "✅ Deploy tamamlandı!"
echo "🌐 http://panel.kamulog.net"
