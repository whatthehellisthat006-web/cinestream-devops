#!/usr/bin/env bash
# ==============================================================================
# CineStream - Staging Deployment & Rollback Script (Atelier 5)
# Usage:
#   Deploy v1.0.0:   bash scripts/deploy-staging.sh v1.0.0
#   Deploy v1.1.0:   bash scripts/deploy-staging.sh v1.1.0
#   Rollback v1.0.0: bash scripts/deploy-staging.sh v1.0.0
# ==============================================================================

set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: Please provide a semantic version tag (e.g. v1.0.0)."
  echo "Usage: bash scripts/deploy-staging.sh vX.Y.Z"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export APP_VERSION="$VERSION"

echo "=================================================="
echo " Deploying CineStream Staging -> $APP_VERSION"
echo "=================================================="

echo "--- 1. Pulling immutable images for $APP_VERSION from GHCR ---"
docker compose -f docker-compose.staging.yml pull backend frontend

echo "--- 2. Starting / updating staging stack ---"
docker compose -f docker-compose.staging.yml up -d

echo "--- 3. Waiting for backend healthcheck (http://localhost:8081/actuator/health) ---"
MAX_WAIT=90
ELAPSED=0
until curl -fsS http://localhost:8081/actuator/health | grep -q '"status":"UP"'; do
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "[FAIL] Backend did not become healthy within ${MAX_WAIT}s!"
    docker compose -f docker-compose.staging.yml logs --tail=50 backend
    exit 1
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  echo "  waiting... (${ELAPSED}s)"
done

echo "[PASS] Backend healthcheck: UP"

echo "--- 4. Verifying frontend (http://localhost:4200/) ---"
if curl -fsS http://localhost:4200/ >/dev/null; then
  echo "[PASS] Frontend is responding on http://localhost:4200/"
else
  echo "[FAIL] Frontend is not responding!"
  exit 1
fi

echo "--- 5. Running image versions ---"
docker compose -f docker-compose.staging.yml ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}"

echo "=================================================="
echo " SUCCESS: CineStream $APP_VERSION is LIVE & HEALTHY"
echo "=================================================="
