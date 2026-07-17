#!/bin/sh
set -eu

database_path="${DATABASE_PATH:-/usr/src/app/data/app.db}"
backup_dir="${BACKUP_DIR:-/usr/src/app/backups}"
database_dir="$(dirname "$database_path")"

mkdir -p "$database_dir" "$backup_dir"
chown -R node:node "$database_dir" "$backup_dir"

if [ "${1:-}" = "npm" ] && [ "${2:-}" = "start" ]; then
  su-exec node npm run db:migrate
fi

exec su-exec node "$@"
