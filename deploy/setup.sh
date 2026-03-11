#!/bin/bash
# ==============================================================================
# WildCard — Add to existing Hetzner VPS (alongside reps)
#
# Prerequisites: Node.js, pnpm, pm2, nginx, certbot already installed (via reps)
# This script only adds WildCard — it does NOT reinstall system packages.
#
# Run as root (or with sudo):
#   chmod +x setup.sh && sudo ./setup.sh
# ==============================================================================

set -euo pipefail

echo "==> WildCard setup (adding to existing VPS)"

# --- 1. Ensure Rust + wasm-pack are installed --------------------------------
if ! command -v rustc &> /dev/null; then
  echo "==> Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

if ! command -v wasm-pack &> /dev/null; then
  echo "==> Installing wasm-pack..."
  curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

source "$HOME/.cargo/env" 2>/dev/null || true

# --- 2. Clone the repository ------------------------------------------------
echo "==> Cloning WildCard repository..."
if [ -d /var/www/wildcard ]; then
  echo "    /var/www/wildcard already exists, pulling latest..."
  cd /var/www/wildcard && git pull origin main
else
  git clone https://github.com/crgeee/wildcard.git /var/www/wildcard
fi
cd /var/www/wildcard

# --- 3. Install dependencies and build --------------------------------------
echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building WASM engine..."
cd packages/engine && wasm-pack build --target web && cd ../..

echo "==> Building all packages..."
pnpm -r build

# --- 4. SSL certificate -----------------------------------------------------
echo "==> Obtaining SSL certificate for wildcard.you..."
echo "    Make sure DNS for wildcard.you points to this server's IP first!"
certbot --nginx -d wildcard.you -d www.wildcard.you \
  --non-interactive --agree-tos --email admin@wildcard.you || {
  echo "    WARN: certbot failed — set up DNS first, then run:"
  echo "    certbot --nginx -d wildcard.you -d www.wildcard.you"
}

# --- 5. Configure nginx (separate server block, does not touch reps) ---------
echo "==> Configuring nginx for wildcard.you..."
cp deploy/nginx.conf /etc/nginx/sites-available/wildcard
ln -sf /etc/nginx/sites-available/wildcard /etc/nginx/sites-enabled/wildcard
# Do NOT remove default or other sites — reps is already configured
nginx -t && systemctl reload nginx
echo "==> Nginx configured (wildcard.you → localhost:3001)"

# --- 6. Start application with pm2 ------------------------------------------
echo "==> Starting WildCard with pm2 (port 3001)..."
cd /var/www/wildcard
pm2 start deploy/ecosystem.config.cjs
pm2 save

echo ""
echo "=============================================="
echo "  WildCard setup complete!"
echo "  Site: https://wildcard.you"
echo "  Port: 3001 (reps remains on 3000)"
echo "  Logs: pm2 logs wildcard"
echo "  Status: pm2 status"
echo "=============================================="
