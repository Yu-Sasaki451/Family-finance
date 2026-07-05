#!/usr/bin/env bash
set -e

cd /var/www/html

echo "Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo "Clearing stale Laravel caches..."
php artisan optimize:clear

echo "Caching Laravel config..."
php artisan config:cache

if [ "${RESET_DATABASE_ON_DEPLOY:-false}" = "true" ]; then
  echo "Rebuilding production database..."
  php artisan migrate:fresh --seed --force
else
  echo "Running production migrations..."
  php artisan migrate --force

  echo "Seeding default data..."
  php artisan db:seed --force
fi

exec /start.sh
