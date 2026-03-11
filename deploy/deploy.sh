#!/bin/bash
# ==============================================================================
# WildCard — Deployment script (run on the server to deploy updates)
#
# Runs as user `chris` (or any non-root user). Uses sudo only for nginx.
#
# Usage:
#   cd /var/www/wildcard && ./deploy/deploy.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/wildcard"
LOCKFILE="/tmp/wildcard-deploy.lock"
DEPLOY_LOG="$APP_DIR/deploy.log"

# --- Logging ------------------------------------------------------------------
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"; }

# --- Lockfile (prevent concurrent deploys) ------------------------------------
if [ -f "$LOCKFILE" ]; then
  log "ERROR: Deploy already in progress (lockfile exists: $LOCKFILE)"
  exit 1
fi
cleanup() { rm -f "$LOCKFILE"; }
trap cleanup EXIT
touch "$LOCKFILE"

# --- Rollback on failure ------------------------------------------------------
PREV_COMMIT=""
rollback() {
  log "ERROR: Deploy failed! Rolling back..."
  if [ -n "$PREV_COMMIT" ]; then
    cd "$APP_DIR"
    git reset --hard "$PREV_COMMIT"
    pnpm install --frozen-lockfile 2>/dev/null || true
    pnpm -r build 2>/dev/null || true
    log "Rolled back to $PREV_COMMIT"
  fi
  pm2 reload deploy/ecosystem.config.cjs 2>/dev/null || true
  log "Rollback complete. Check logs: pm2 logs wildcard"
}
trap rollback ERR

cd "$APP_DIR"
PREV_COMMIT=$(git rev-parse HEAD)

# --- Load nvm if present (matches reps pattern) ------------------------------
export NVM_DIR="${HOME}/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

log "==> Deploying WildCard (from $PREV_COMMIT)"

# --- Pull latest changes -----------------------------------------------------
log "==> Pulling latest changes..."
git pull origin main

NEW_COMMIT=$(git rev-parse HEAD)
if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
  log "==> No new changes to deploy."
  exit 0
fi
log "==> Updating $PREV_COMMIT → $NEW_COMMIT"

# --- Install dependencies ----------------------------------------------------
log "==> Installing dependencies..."
pnpm install --frozen-lockfile

# --- Build WASM engine -------------------------------------------------------
log "==> Building WASM engine..."
source "$HOME/.cargo/env" 2>/dev/null || true
cd packages/engine && wasm-pack build --target web && cd "$APP_DIR"

# --- Build all packages -------------------------------------------------------
log "==> Building all packages..."
pnpm -r build

# --- Stop, then start (safe for fork mode) ------------------------------------
log "==> Restarting pm2..."
pm2 stop wildcard 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs

# --- Sync nginx config (requires sudo) ----------------------------------------
if ! diff -q deploy/nginx.conf /etc/nginx/sites-available/wildcard > /dev/null 2>&1; then
  log "==> Nginx config changed, updating..."
  sudo cp deploy/nginx.conf /etc/nginx/sites-available/wildcard
  sudo nginx -t && sudo systemctl reload nginx
  log "==> Nginx reloaded"
fi

# --- Health check -------------------------------------------------------------
log "==> Waiting for server to start..."
sleep 2

if curl -sf http://localhost:3001/api/health > /dev/null; then
  log "==> Health check passed"
else
  log "==> WARN: Health check failed, check logs: pm2 logs wildcard"
  exit 1
fi

log "==> Deploy complete! ($PREV_COMMIT → $NEW_COMMIT)"
