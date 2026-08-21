#!/bin/sh
set -e

extract_failed_migration() {
  sed -n 's/.*The `\([^`]*\)` migration.*/\1/p' "$1" | head -1
}

echo "=== Production startup ==="
echo "Running database migrations (prisma migrate deploy)..."

while true; do
  if npx prisma migrate deploy 2>/tmp/prisma-migrate.err; then
    echo "Database migrations applied successfully."
    break
  fi

  if grep -q "P3009\|P3018\|failed migrations\|failed to apply" /tmp/prisma-migrate.err; then
    FAILED_MIGRATION=$(extract_failed_migration /tmp/prisma-migrate.err)
    if [ -z "$FAILED_MIGRATION" ]; then
      FAILED_MIGRATION=$(grep "Migration name:" /tmp/prisma-migrate.err | sed 's/.*Migration name: //' | tr -d '\r' | head -1)
    fi
    if [ -n "$FAILED_MIGRATION" ]; then
      echo "Recovering failed migration: $FAILED_MIGRATION"
      npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION"
      echo "Retrying database migrations..."
      continue
    fi
  fi

  echo "Migration deploy failed:"
  cat /tmp/prisma-migrate.err >&2
  exit 1
done

if [ "$RUN_DB_SEED" = "true" ]; then
  echo "Seeding database..."
  node dist/prisma/seed.js
else
  echo "Skipping database seed (set RUN_DB_SEED=true to enable)."
fi

echo "Starting NestJS (migrations also run from main.ts as a safety net)..."
exec "$@"
