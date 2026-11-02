#!/bin/sh
# Production start on Railway: the database and uploads live on the volume at /data.
set -e
DATA=${DATA_DIR:-/data}
mkdir -p "$DATA/uploads"
[ -e uploads ] || ln -s "$DATA/uploads" uploads
export DATABASE_URL=${DATABASE_URL:-file:$DATA/app.db}
FRESH=0
[ -f "$DATA/app.db" ] || FRESH=1
npx prisma db push --skip-generate
# Seed demo data only on the very first boot; the seed wipes users.
if [ "$FRESH" = 1 ]; then npx tsx prisma/seed.ts && npx tsx prisma/sample.ts; fi
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
