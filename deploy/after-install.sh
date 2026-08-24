#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/admin/consultancy-backend"
SERVICE_NAME="milestonegermany-backend.service"

chown -R admin:admin "$APP_DIR"

cd "$APP_DIR"

npm ci --omit=dev

# configure nginx
install \
  -m 0644 \
  "$APP_DIR/deploy/nginx/conf.d/upgrade.conf" \
  "/etc/nginx/conf.d/upgrade.conf"

install \
  -m 0644 \
  "$APP_DIR/deploy/nginx/sites-available/milestone_backend" \
  "/etc/nginx/sites-available/milestone_backend"

nginx -t

systemctl reload nginx

install \
  -m 0644 \
  "$APP_DIR/deploy/$SERVICE_NAME" \
  "/etc/systemd/system/$SERVICE_NAME"

chmod +x "$APP_DIR/deploy/start.sh"
chmod +x "$APP_DIR/deploy/start-service.sh"
chmod +x "$APP_DIR/deploy/validate-service.sh"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"