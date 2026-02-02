#!/bin/bash
# Auto-deploy script - HTTPS only, no SSH needed
# Run this script on the server to pull latest release

set -e

REPO="SahinSedat/kamulogstk-web"
APP_DIR="/var/www/kamulogstk-web"
BACKUP_DIR="/var/www/backups"

echo "🚀 Starting deployment..."

# Get latest release tag
LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
    echo "❌ No releases found!"
    exit 1
fi

echo "📦 Latest release: $LATEST_TAG"

# Download release artifact
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/deploy.tar.gz"
echo "⬇️  Downloading from: $DOWNLOAD_URL"

cd /tmp
rm -f deploy.tar.gz
curl -L -o deploy.tar.gz "$DOWNLOAD_URL"

# Backup current .next
mkdir -p $BACKUP_DIR
if [ -d "$APP_DIR/.next" ]; then
    echo "💾 Backing up current build..."
    tar -czf "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C $APP_DIR .next
fi

# Extract new build
echo "📂 Extracting new build..."
cd $APP_DIR
rm -rf .next
tar -xzf /tmp/deploy.tar.gz

# Install production dependencies only if package-lock changed
echo "📦 Installing dependencies..."
npm ci --production

# Run migrations
echo "🔄 Running migrations..."
npx prisma migrate deploy

# Restart PM2
echo "🔄 Restarting application..."
pm2 restart kamulogstk

# Cleanup
rm -f /tmp/deploy.tar.gz

# Keep only last 5 backups
cd $BACKUP_DIR
ls -t | tail -n +6 | xargs -r rm --

echo "✅ Deployment complete!"
pm2 status kamulogstk
