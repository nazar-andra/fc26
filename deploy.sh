#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/apps/fc26"

: "${FC26_IMAGE:?FC26_IMAGE is required}"
: "${GHCR_USER:?GHCR_USER is required}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required}"

cd "$APP_DIR"
mkdir -p data

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

export FC26_IMAGE
export ADMIN_USER="${ADMIN_USER:-admin}"
export ADMIN_PASS="${ADMIN_PASS:-123}"

docker rm -f fc26 2>/dev/null || true
docker compose pull
docker compose up -d --no-build --force-recreate
docker image prune -f
docker compose ps
