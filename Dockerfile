FROM node:22-bookworm-slim AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY resources ./resources
COPY vite.config.js ./
RUN npm run build

FROM richarvey/nginx-php-fpm:3.1.6

COPY . .
COPY --from=frontend /app/public/build ./public/build

ENV SKIP_COMPOSER=1
ENV WEBROOT=/var/www/html/public
ENV PHP_ERRORS_STDERR=1
ENV RUN_SCRIPTS=0
ENV REAL_IP_HEADER=1

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr

ENV COMPOSER_ALLOW_SUPERUSER=1

COPY docker/render/start.sh /usr/local/bin/family-finance-start
RUN chmod +x /usr/local/bin/family-finance-start

CMD ["/usr/local/bin/family-finance-start"]
