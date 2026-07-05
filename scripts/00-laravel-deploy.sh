#!/usr/bin/env bash
set -e

echo "Running composer install..."
composer install --no-dev --optimize-autoloader --working-dir=/var/www/html

echo "Clearing stale caches..."
php artisan optimize:clear

echo "Caching config..."
php artisan config:cache

echo "Rebuilding production database..."
php artisan migrate:fresh --seed --force
