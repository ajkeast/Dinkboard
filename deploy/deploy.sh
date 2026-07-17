#!/usr/bin/env bash
# Production deploy on the VPS. Invoked by GitHub Actions (or manually over SSH).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/apps/dinkboard}"
cd "$APP_DIR"

echo "==> Fetching origin/main"
git fetch --depth=1 origin main
git checkout -B main origin/main

if [[ ! -f server/.env ]]; then
  echo "ERROR: server/.env missing in $APP_DIR (not in git — restore from backup)" >&2
  exit 1
fi

echo "==> Building and starting containers"
docker compose -f docker-compose.prod.yml up --build -d

echo "==> Running migrations"
docker exec dinkboard-server npm run migrate

echo "==> Health check"
sleep 2
curl -fsS https://dinkscord.com/api/health
echo
echo "==> Deploy complete ($(git rev-parse --short HEAD))"
