# WildCard Deployment Guide

## Prerequisites

- Hetzner VPS (CX22 or larger) running Ubuntu 22.04+
- Domain `wildcard.you` with DNS A record pointing to the server IP
- SSH access to the server as root

## First-Time Setup

1. SSH into the server:

   ```bash
   ssh root@<server-ip>
   ```

2. Download and review the setup script:

   ```bash
   curl -O https://raw.githubusercontent.com/crgeee/wildcard/main/deploy/setup.sh
   chmod +x setup.sh
   # Review the script before running!
   cat setup.sh
   sudo ./setup.sh
   ```

   This installs Node 22, pnpm, pm2, nginx, certbot, Rust, and wasm-pack, then
   clones the repo to `/opt/wildcard`, builds everything, obtains an SSL
   certificate, and starts the application.

## Deploying Updates

SSH into the server and run:

```bash
cd /opt/wildcard && ./deploy/deploy.sh
```

This pulls the latest code, rebuilds, and does a zero-downtime pm2 reload with a
health check.

## Monitoring

```bash
# Application status
pm2 status

# Live logs
pm2 logs wildcard

# Restart
pm2 restart wildcard

# Reload (zero-downtime)
pm2 reload wildcard
```

## SSL Renewal

Certbot installs a systemd timer that auto-renews certificates. Verify with:

```bash
sudo certbot renew --dry-run
```

## Nginx

```bash
# Test configuration
sudo nginx -t

# Reload after config changes
sudo systemctl reload nginx

# View access logs
tail -f /var/log/nginx/access.log
```

## Troubleshooting

- **502 Bad Gateway** -- Node server is not running. Check `pm2 status` and `pm2 logs wildcard`.
- **SSL errors** -- Run `sudo certbot renew` and `sudo systemctl reload nginx`.
- **Build failures** -- Check that Rust/wasm-pack are installed: `rustc --version && wasm-pack --version`.
