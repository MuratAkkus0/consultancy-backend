#!/usr/bin/env bash
set -euo pipefail

SSM_PATH="/milestonegermany/prod/"
AWS_REGION="eu-central-1"

ENV_EXPORTS="$(
  aws ssm get-parameters-by-path \
    --path "$SSM_PATH" --recursive --with-decryption \
    --region "$AWS_REGION" --output json \
  | jq -r '.Parameters[] | "export \(.Name | split("/") | last)=\(.Value | @sh)"'
)"
eval "$ENV_EXPORTS"

exec /usr/bin/node /srv/edu-danisman/dist/server.js