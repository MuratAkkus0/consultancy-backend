#!/usr/bin/env bash
set -euo pipefail

URL="http://127.0.0.1/health"

for attempt in {1..12}; do
  if curl \
    --fail \
    --silent \
    --show-error \
    "$URL" > /dev/null; then

    echo "Application is healthy."
    exit 0
  fi

  echo "Health check failed (attempt $attempt/12)"
  sleep 5
done

echo "Application failed health validation."
exit 1