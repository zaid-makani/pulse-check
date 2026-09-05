#!/bin/sh
set -e
echo "Applying database migrations…"
node node_modules/prisma/build/index.js migrate deploy
echo "Starting PulseCheck on :${PORT:-3000}"
exec node server.js
