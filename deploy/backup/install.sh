#!/usr/bin/env bash
#
# Runs ON THE VPS, by hand, after a deploy that changed anything in this folder:
#   sudo bash /srv/consultancy-backend/current/deploy/backup/install.sh
#
# Not wired into remote-release.sh on purpose: the backup runs as root and
# covers the frontend and cms too, so a routine backend deploy must not be able
# to replace it.
#
# The two secrets are never shipped from the repo and never touched here:
#   /etc/consultancy-backup/age-recipient.txt  public key; the private key stays
#                                              offline so this host cannot read
#                                              its own backups
#   /root/.config/rclone/rclone.conf           B2 credentials
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo." >&2; exit 1; }

SRC="$(cd "$(dirname "$0")" && pwd)"
CONF_DIR=/etc/consultancy-backup
UNIT_DIR=/etc/systemd/system

install -m 750 -o root -g root "$SRC/consultancy-backup" /usr/local/bin/consultancy-backup
install -d -m 700 -o root -g root "$CONF_DIR"
install -m 600 -o root -g root "$SRC/config" "$CONF_DIR/config"

for unit in consultancy-backup.service consultancy-backup.timer consultancy-backup-failed.service; do
  install -m 644 -o root -g root "$SRC/$unit" "$UNIT_DIR/$unit"
done

systemctl daemon-reload
systemctl enable --now consultancy-backup.timer

[ -s "$CONF_DIR/age-recipient.txt" ] || echo "WARNING: $CONF_DIR/age-recipient.txt is missing - backups will fail." >&2
[ -s /root/.config/rclone/rclone.conf ] || echo "WARNING: /root/.config/rclone/rclone.conf is missing - backups will fail." >&2

systemctl list-timers consultancy-backup.timer --no-pager
