#!/usr/bin/env bash
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

# Hit the app directly: nginx has a catch-all site that would answer instead.
APP_PORT=3001
HEALTH_URL="http://127.0.0.1:$APP_PORT/health"

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

cd "$RELEASE_DIR"
npm ci --omit=dev

ln -sfn "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
echo ".env file linked into release dir."

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
echo "Current version link updated."

sudo systemctl restart "$SERVICE_NAME"
echo "Service restarted."

if check_health; then
  echo "Deployment successful."

  # Both sides go through readlink -f so the trailing slash from 'ls -dt */'
  # does not break the comparison.
  CURRENT_TARGET="$(readlink -f "$CURRENT_LINK")"

  ls -dt "$RELEASES_DIR"/*/ | tail -n +$((KEEP_RELEASES + 1)) | while read -r dir; do
    dir="$(readlink -f "$dir")"

    # A rollback can leave an older release live; never prune it.
    if [ "$dir" = "$CURRENT_TARGET" ]; then
      echo "Skipping live release $dir"
      continue
    fi

    rm -rf "$dir"
    echo "Pruned old release $dir"
  done
else
  if [ -z "$PREVIOUS_RELEASE" ]; then
    echo "No Previous release available." >&2
    exit 1
  fi

  ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
  echo "Current version link updated to previous version."

  sudo systemctl restart "$SERVICE_NAME"
  echo "Service restarted."

  if check_health; then
    echo "Rollback successful. Live version $PREVIOUS_RELEASE ."
  else
    echo "Failed to Rollback release $PREVIOUS_RELEASE ." >&2
  fi

  exit 1
fi
