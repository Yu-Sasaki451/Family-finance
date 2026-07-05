FROM node:22-bookworm-slim AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY resources ./resources
COPY vite.config.js ./
RUN npm run build

FROM richarvey/nginx-php-fpm:3.1.6

ARG APP_VERSION=unknown

COPY . .
COPY --from=frontend /app/public/build ./public/build

ENV SKIP_COMPOSER=1
ENV WEBROOT=/var/www/html/public
ENV PHP_ERRORS_STDERR=1
ENV RUN_SCRIPTS=1
ENV REAL_IP_HEADER=1

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr
ENV APP_VERSION=${APP_VERSION}

ENV COMPOSER_ALLOW_SUPERUSER=1

CMD ["/start.sh"]
