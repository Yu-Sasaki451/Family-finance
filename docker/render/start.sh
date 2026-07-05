#!/usr/bin/env bash
set -e

cd /var/www/html

echo "Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo "Clearing stale Laravel caches..."
php artisan optimize:clear

echo "Caching Laravel config..."
php artisan config:cache

echo "Rebuilding production database..."
php artisan migrate:fresh --seed --force

exec /start.sh
