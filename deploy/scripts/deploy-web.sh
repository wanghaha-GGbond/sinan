#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: deploy-web.sh <registry/app-image:immutable-tag> <registry/migrator-image:immutable-tag>" >&2
  exit 64
fi

readonly app_image="$1"
readonly migrator_image="$2"
readonly app_dir="/opt/sinan"
readonly env_file="$app_dir/web.env"
readonly current_name="sinan-web"
readonly candidate_name="sinan-web-candidate"
readonly release="${app_image##*:}"
readonly migration_version="${MIGRATION_VERSION:-unknown}"
readonly audit_dir="$app_dir/releases"
result="failed"

if [[ ! "$release" =~ ^[[:alnum:]][[:alnum:]._-]*$ ]]; then
  echo "invalid immutable image tag" >&2
  exit 64
fi

if [[ ! -f "$env_file" ]]; then
  echo "missing runtime environment: $env_file" >&2
  exit 66
fi

previous_image=""
if docker inspect "$current_name" >/dev/null 2>&1; then
  previous_image=$(docker inspect --format '{{.Config.Image}}' "$current_name")
fi
current_image="$previous_image"

cleanup_candidate() {
  docker rm -f "$candidate_name" >/dev/null 2>&1 || true
}

restore_previous() {
  [[ -n "$previous_image" ]] || return 0
  docker rm -f "$current_name" >/dev/null 2>&1 || true
  docker run -d --name "$current_name" \
    --env-file "$env_file" \
    -e APP_RELEASE="${previous_image##*:}" \
    -p 127.0.0.1:3000:3000 \
    --restart=unless-stopped \
    --log-driver=json-file \
    --log-opt max-size=50m \
    --log-opt max-file=5 \
    "$previous_image" >/dev/null
  if ! wait_ready 3000; then
    docker logs "$current_name" --tail 200 >&2 || true
    echo "previous application failed readiness during restore" >&2
    return 1
  fi
}

wait_ready() {
  local port="$1"
  for attempt in {1..30}; do
    if curl --fail --silent --show-error "http://127.0.0.1:${port}/api/health/ready" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

record_audit() {
  local result_value="$1"
  local audit_file="$audit_dir/${release}.env"
  umask 027
  install -d -m 0750 "$audit_dir"
  {
    printf 'RELEASED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'APP_IMAGE=%s\n' "$app_image"
    printf 'MIGRATOR_IMAGE=%s\n' "$migrator_image"
    printf 'CURRENT_IMAGE=%s\n' "$current_image"
    printf 'PREVIOUS_IMAGE=%s\n' "$previous_image"
    printf 'MIGRATION_VERSION=%s\n' "$migration_version"
    printf 'RESULT=%s\n' "$result_value"
  } > "$audit_file"
}

on_exit() {
  cleanup_candidate
  record_audit "$result" || true
}

trap on_exit EXIT

# Migration is a precondition. It runs before the current container is
# touched, so a bad forward migration leaves the live application unchanged.
docker pull "$app_image"
docker pull "$migrator_image"
if ! docker run --rm \
  --env-file "$env_file" \
  -e APP_RELEASE="$release" \
  "$migrator_image"; then
  echo "database migration failed; current application was left unchanged" >&2
  exit 1
fi

cleanup_candidate
docker run -d --name "$candidate_name" \
  --env-file "$env_file" \
  -e APP_RELEASE="$release" \
  -p 127.0.0.1:3001:3000 \
  --restart=no \
  --log-driver=json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  "$app_image" >/dev/null

if ! wait_ready 3001; then
  docker logs "$candidate_name" --tail 200 >&2 || true
  echo "candidate failed readiness; current application was left unchanged" >&2
  exit 1
fi

docker rm -f "$current_name" >/dev/null 2>&1 || true
if ! docker run -d --name "$current_name" \
  --env-file "$env_file" \
  -e APP_RELEASE="$release" \
  -p 127.0.0.1:3000:3000 \
  --restart=unless-stopped \
  --log-driver=json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  "$app_image" >/dev/null; then
  echo "failed to start new current container; restoring previous image" >&2
  restore_previous
  exit 1
fi

if wait_ready 3000; then
  current_image="$app_image"
  printf '%s\n' "$app_image" > "$app_dir/current-image"
  [[ -z "$previous_image" ]] || printf '%s\n' "$previous_image" > "$app_dir/previous-image"
  result="success"
  exit 0
fi

docker logs "$current_name" --tail 200 >&2 || true
docker rm -f "$current_name" >/dev/null 2>&1 || true
echo "new current container failed readiness; restoring previous image" >&2
restore_previous
exit 1
