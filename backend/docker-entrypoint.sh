#!/bin/sh
set -e

# Create all required directories
mkdir -p /app/uploads/screens
mkdir -p /app/uploads/firmware
mkdir -p /app/uploads/widgets
mkdir -p /app/uploads/captures
mkdir -p /app/uploads/drawings
mkdir -p /app/logs

# Run database migrations (ignore errors on fresh install)
bunx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true

# Execute the main command
exec "$@"
