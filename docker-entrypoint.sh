#!/bin/sh
set -e
# Create/upgrade tables on start (safe to repeat), then run the server.
node node_modules/prisma/build/index.js db push --schema prisma/schema.postgres.prisma --skip-generate
exec node server.js
