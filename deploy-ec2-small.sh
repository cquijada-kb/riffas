#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if docker info >/dev/null 2>&1; then
  DOCKER_CMD=(docker)
else
  DOCKER_CMD=(sudo docker)
fi

export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-0}"

cd "$PROJECT_DIR"

echo "==> Usando compose: $COMPOSE_FILE"
echo "==> Paralelismo Docker Compose: $COMPOSE_PARALLEL_LIMIT"
echo "==> Construyendo backend..."
"${DOCKER_CMD[@]}" compose -f "$COMPOSE_FILE" build backend

echo "==> Construyendo public-frontend..."
"${DOCKER_CMD[@]}" compose -f "$COMPOSE_FILE" build public-frontend

echo "==> Construyendo admin-frontend..."
"${DOCKER_CMD[@]}" compose -f "$COMPOSE_FILE" build admin-frontend

echo "==> Levantando stack..."
"${DOCKER_CMD[@]}" compose -f "$COMPOSE_FILE" up -d

echo "==> Estado de contenedores:"
"${DOCKER_CMD[@]}" compose -f "$COMPOSE_FILE" ps

echo "==> Listo. Para ver logs:"
echo "    ${DOCKER_CMD[*]} compose -f $COMPOSE_FILE logs -f"
