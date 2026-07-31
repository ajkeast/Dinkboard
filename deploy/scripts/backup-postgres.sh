#!/usr/bin/env bash
# Nightly (or manual) Postgres dump for dinkboard.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/apps/dinkboard/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

docker exec dinkboard-postgres pg_dump -U "${POSTGRES_USER:-dinkboard}" -d "${POSTGRES_DB:-dinkboard}" \
  --format=custom --file="/tmp/dinkboard-${STAMP}.dump"

docker cp "dinkboard-postgres:/tmp/dinkboard-${STAMP}.dump" "${BACKUP_DIR}/dinkboard-${STAMP}.dump"
docker exec dinkboard-postgres rm -f "/tmp/dinkboard-${STAMP}.dump"

find "$BACKUP_DIR" -name 'dinkboard-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "Backup written: ${BACKUP_DIR}/dinkboard-${STAMP}.dump"
