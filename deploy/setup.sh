#!/bin/bash
# ==============================================================================
# WildCard — First-time server setup script
# Target: Hetzner VPS running Ubuntu 22.04+
#
# Run as root (or with sudo):
#   chmod +x setup.sh && sudo ./setup.sh
#
# This script is meant to be reviewed and run manually, NOT piped to bash.
# ==============================================================================

set -euo pipefail

echo "==> WildCard server setup"

# --- 1. System updates --------------------------------------------------------
echo "==> Updating system packages..."
apt-get update && apt-get upgrade -y

# --- 2. Firewall (ufw) -------------------------------------------------------
echo "==> Configuring firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo "==> Firewall enabled (22, 80, 443 allowed)"

# --- 3. Install Node.js 22 via NodeSource -------------------------------------
echo "==> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# --- 4. Install pnpm ---------------------------------------------------------
echo "==> Installing pnpm..."
npm install -g pnpm

# --- 5. Install pm2 ----------------------------------------------------------
echo "==> Installing pm2..."
npm install -g pm2

# --- 6. Install nginx ---------------------------------------------------------
echo "==> Installing nginx..."
apt-get install -y nginx

# --- 7. Install certbot (Let's Encrypt) --------------------------------------
echo "==> Installing certbot..."
apt-get install -y certbot python3-certbot-nginx

# --- 8. Install Rust + wasm-pack (for engine builds) -------------------------
echo "==> Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
echo "==> Installing wasm-pack..."
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# --- 9. Clone the repository -------------------------------------------------
echo "==> Cloning WildCard repository..."
mkdir -p /opt/wildcard
git clone https://github.com/crgeee/wildcard.git /opt/wildcard
cd /opt/wildcard

# --- 10. Install dependencies and build --------------------------------------
echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building WASM engine..."
cd packages/engine && wasm-pack build --target web && cd ../..

echo "==> Building all packages..."
pnpm -r build

# --- 11. SSL certificate with certbot ----------------------------------------
echo "==> Obtaining SSL certificate..."
echo "    Make sure DNS for wildcard.you points to this server's IP first!"
certbot --nginx -d wildcard.you -d www.wildcard.you --non-interactive --agree-tos --email admin@wildcard.you

# --- 12. Configure nginx ------------------------------------------------------
echo "==> Configuring nginx..."
cp deploy/nginx.conf /etc/nginx/sites-available/wildcard
ln -sf /etc/nginx/sites-available/wildcard /etc/nginx/sites-enabled/wildcard
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# --- 13. Start application with pm2 ------------------------------------------
echo "==> Starting WildCard with pm2..."
cd /opt/wildcard
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "=============================================="
echo "  WildCard setup complete!"
echo "  Site: https://wildcard.you"
echo "  Logs: pm2 logs wildcard"
echo "  Status: pm2 status"
echo "=============================================="
