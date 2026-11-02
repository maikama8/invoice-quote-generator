#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
npx prisma migrate deploy
npx prisma db seed
exec npx next start --hostname 0.0.0.0 --port "${PORT:-3000}"
