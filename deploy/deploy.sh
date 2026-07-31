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

if [[ ! -f .env ]]; then
  echo "ERROR: root .env missing (needs POSTGRES_PASSWORD for compose)" >&2
  exit 1
fi

echo "==> Building and starting containers"
docker compose -f docker-compose.prod.yml --env-file .env up --build -d

echo "==> Waiting for Postgres"
for i in $(seq 1 30); do
  if docker exec dinkboard-postgres pg_isready -U "${POSTGRES_USER:-dinkboard}" -d "${POSTGRES_DB:-dinkboard}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Running migrations"
docker exec dinkboard-server npm run migrate

echo "==> Health check"
sleep 2
curl -fsS https://dinkscord.com/api/health
echo
echo "==> Deploy complete ($(git rev-parse --short HEAD))"
