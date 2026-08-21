#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/admin/consultancy-backend"

chown -R admin:admin "$APP_DIR"

cd "$APP_DIR"

npm ci --omit=dev

chmod +x "$APP_DIR/deploy/start.sh"
chmod +x "$APP_DIR/deploy/start-service.sh"
chmod +x "$APP_DIR/deploy/validate-service.sh"

cp \
  "$APP_DIR/deploy/milestonegermany-backend.service" \
  /etc/systemd/system/milestonegermany-backend.service

systemctl daemon-reload
systemctl enable milestonegermany-backend.service