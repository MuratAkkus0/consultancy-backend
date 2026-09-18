#!/usr/bin/env bash
#
# Runs ON THE VPS. Streamed via: ssh vps 'bash -s' -- <sha> < this-file
#
# NEVER use 'set -x' here: the trace would leak env values into the Actions log.
set -euo pipefail

APP_ROOT="/srv/consultancy-backend"
CURRENT_LINK="$APP_ROOT/current"
RELEASE_SHA="${1:?"release sha is required"}"
RELEASES_DIR="$APP_ROOT/releases"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_SHA"
SHARED_DIR="$APP_ROOT/shared"
SERVICE_NAME="consultancy-backend.service"
KEEP_RELEASES=5

PREVIOUS_RELEASE=""

# Caddy fronts the app, so a direct port check only proves half the path.
APP_PORT=3001
HEALTH_URL="http://127.0.0.1:$APP_PORT/health"

# This repo owns exactly this one site file, which currently declares all three
# hosts. If the frontend or cms repo ever starts deploying Caddy config too,
# split it: one file per repo plus its own symlink in sites-enabled, or the
# deploys will silently overwrite each other.
CADDY_SITE="campus69-de"
CADDY_SRC="$RELEASE_DIR/deploy/caddy/sites-available/$CADDY_SITE"
CADDY_DEST="/etc/caddy/sites-available/$CADDY_SITE"
CADDY_BACKUP=""

PUBLIC_HOST="api.campus69.de"
PUBLIC_HEALTH_URL="https://$PUBLIC_HOST/health"

cleanup() { [ -n "$CADDY_BACKUP" ] && rm -f "$CADDY_BACKUP"; }
trap cleanup EXIT

check_health() {
  for attempt in {1..12}; do
    if curl \
      --fail \
      --silent \
      --show-error \
      "$HEALTH_URL" >/dev/null; then
      echo "Application is healthy."
      return 0
    fi
    echo "Health check failed (attempt $attempt/12)"
    sleep 5
  done
  return 1
}

check_public_health() {
  # --resolve pins the connection to loopback while still sending the real
  # hostname, so this tests Caddy's routing and certificate rather than the
  # provider's hairpin NAT or the public DNS path.
  for attempt in {1..6}; do
    if curl \
      --fail \
      --silent \
      --show-error \
      --resolve "$PUBLIC_HOST:443:127.0.0.1" \
      "$PUBLIC_HEALTH_URL" >/dev/null; then
      echo "Public endpoint is healthy: $PUBLIC_HEALTH_URL"
      return 0
    fi
    echo "Public health check failed (attempt $attempt/6)"
    sleep 5
  done
  return 1
}

reload_caddy() {
  # Validate the whole Caddyfile, not just this fragment: a fragment can be
  # valid on its own and still collide with another site block. A reload of a
  # broken config would take down every host at once.
  local out
  out="$(caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1)" || {
    echo "caddy validate failed:" >&2
    echo "$out" | tail -20 >&2
    return 1
  }
  sudo systemctl reload caddy
  echo "Caddy reloaded."
}

update_caddy() {
  if [ ! -f "$CADDY_SRC" ]; then
    echo "Caddy site file missing from the release: $CADDY_SRC" >&2
    return 1
  fi

  # The deploy user owns sites-available but not sites-enabled, so it can update
  # an already-enabled site and cannot enable a new one. Enabling stays manual.
  if [ ! -f "$CADDY_DEST" ]; then
    echo "$CADDY_DEST does not exist - enable the site once by hand first." >&2
    return 1
  fi

  if cmp -s "$CADDY_SRC" "$CADDY_DEST"; then
    echo "Caddy config unchanged."
    return 0
  fi

  CADDY_BACKUP="$(mktemp)"
  cp "$CADDY_DEST" "$CADDY_BACKUP"
  cp "$CADDY_SRC" "$CADDY_DEST"
  echo "Caddy config updated."

  reload_caddy
}

restore_caddy() {
  [ -n "$CADDY_BACKUP" ] || return 0
  echo "Restoring the previous Caddy config." >&2
  cp "$CADDY_BACKUP" "$CADDY_DEST"
  reload_caddy || echo "Caddy reload failed while restoring - manual action needed." >&2
}

rollback_release() {
  if [ -z "$PREVIOUS_RELEASE" ]; then
    echo "No previous release to roll back to." >&2
    return
  fi

  ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
  echo "Current version link updated to previous version."

  sudo systemctl restart "$SERVICE_NAME"
  echo "Service restarted."

  if check_health; then
    echo "Rollback successful. Live version $PREVIOUS_RELEASE"
  else
    echo "Rollback failed for release $PREVIOUS_RELEASE - manual action needed." >&2
  fi
}

prune_releases() {
  # Both sides go through readlink -f so the trailing slash from 'ls -dt */'
  # does not break the comparison.
  local current_target dir
  current_target="$(readlink -f "$CURRENT_LINK")"

  ls -dt "$RELEASES_DIR"/*/ | tail -n +$((KEEP_RELEASES + 1)) | while read -r dir; do
    dir="$(readlink -f "$dir")"

    # A rollback can leave an older release live; never prune it.
    if [ "$dir" = "$current_target" ]; then
      echo "Skipping live release $dir"
      continue
    fi

    rm -rf "$dir"
    echo "Pruned old release $dir"
  done
}

# --- checks -----------------------------------------------------------------

# Read the live target before the flip; rollback has no other way back.
if [ -L "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
  echo "Previous release found. PREVIOUS_RELEASE=$PREVIOUS_RELEASE"
else
  echo "No previous release available."
fi

if [ ! -d "$RELEASE_DIR" ]; then
  echo "Release directory $RELEASE_DIR not found." >&2
  exit 1
fi

if [ ! -f "$SHARED_DIR/.env" ]; then
  echo ".env file not found in $SHARED_DIR" >&2
  exit 1
fi

# --- release ----------------------------------------------------------------

cd "$RELEASE_DIR"
npm ci --omit=dev

ln -sfn "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
echo ".env file linked into release dir."

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
echo "Current version link updated."

sudo systemctl restart "$SERVICE_NAME"
echo "Service restarted."

if ! check_health; then
  rollback_release
  exit 1
fi

# --- proxy ------------------------------------------------------------------
# Only now: a Caddy pointing at an app that never came up would serve 502s.

if ! update_caddy; then
  restore_caddy
  rollback_release
  exit 1
fi

if ! check_public_health; then
  restore_caddy
  rollback_release
  exit 1
fi

prune_releases
echo "Deployment successful."
