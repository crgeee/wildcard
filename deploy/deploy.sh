#!/bin/bash
# ==============================================================================
# WildCard — Deployment script (run on the server to deploy updates)
#
# Usage:
#   cd /opt/wildcard && ./deploy/deploy.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/opt/wildcard"
cd "$APP_DIR"

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building WASM engine..."
cd packages/engine && wasm-pack build --target web && cd "$APP_DIR"

echo "==> Building all packages..."
pnpm -r build

echo "==> Reloading pm2 (zero-downtime)..."
pm2 reload deploy/ecosystem.config.cjs

echo "==> Waiting for server to start..."
sleep 2

echo "==> Health check..."
if curl -sf http://localhost:3000/api/health > /dev/null; then
  echo "    OK — server is healthy"
else
  echo "    WARN — health check failed, check logs: pm2 logs wildcard"
  exit 1
fi

echo "==> Deployment complete!"
