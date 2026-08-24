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

# configure nginx
# copy upgrade.conf
sudo cp /home/admin/consultancy-backend/deploy/nginx/conf.d/upgrade.conf /etc/nginx/conf.d/upgrade.conf
# copy milestone_backend
sudo cp /home/admin/consultancy-backend/deploy/nginx/sites-available/milestone_backend /etc/nginx/sites-available/milestone_backend

sudo nginx -t && sudo systemctl reload nginx.service


exec /usr/bin/node /home/admin/consultancy-backend/dist/server.js