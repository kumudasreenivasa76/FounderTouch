#!/bin/sh
# Railway start: the database and uploads live on the volume at /data.
set -e
DATA=${DATA_DIR:-/data}
mkdir -p "$DATA/uploads"
[ -e uploads ] || ln -s "$DATA/uploads" uploads
export DATABASE_URL=${DATABASE_URL:-file:$DATA/app.db}
FRESH=0
[ -f "$DATA/app.db" ] || FRESH=1
npx prisma db push --skip-generate
npx tsx prisma/migrate-modes.ts || true
# SKIP_DEMO=1 (the tapnodd-test service) starts empty, like a real new install.
if [ "${SKIP_DEMO:-0}" != 1 ]; then
  # Demo data only on the very first boot; the seed wipes users.
  if [ "$FRESH" = 1 ]; then npx tsx prisma/seed.ts; fi
  # Demo photos, people, product pictures and an event: fills only what is missing.
  npx tsx prisma/demo-extras.ts || true
  npx tsx prisma/demo-data.ts || true
  npx tsx prisma/demo-messages.ts || true
fi
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
