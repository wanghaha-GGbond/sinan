#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: deploy-web.sh <registry/image:immutable-tag>" >&2
  exit 64
fi

readonly image="$1"
readonly app_dir="/opt/sinan"
readonly env_file="$app_dir/web.env"
readonly current_name="sinan-web"
readonly candidate_name="sinan-web-candidate"
readonly release="${image##*:}"

if [[ ! -f "$env_file" ]]; then
  echo "missing runtime environment: $env_file" >&2
  exit 66
fi

previous_image=""
if docker inspect "$current_name" >/dev/null 2>&1; then
  previous_image=$(docker inspect --format '{{.Config.Image}}' "$current_name")
fi

cleanup_candidate() {
  docker rm -f "$candidate_name" >/dev/null 2>&1 || true
}
trap cleanup_candidate EXIT

docker pull "$image"
cleanup_candidate
docker run -d --name "$candidate_name" \
  --env-file "$env_file" \
  -e APP_RELEASE="$release" \
  -p 127.0.0.1:3001:3000 \
  --restart=no \
  --log-driver=json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  "$image"

for attempt in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:3001/api/health/ready >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    docker logs "$candidate_name" --tail 200 >&2
    exit 1
  fi
  sleep 2
done

docker rm -f "$current_name" >/dev/null 2>&1 || true
docker run -d --name "$current_name" \
  --env-file "$env_file" \
  -e APP_RELEASE="$release" \
  -p 127.0.0.1:3000:3000 \
  --restart=unless-stopped \
  --log-driver=json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  "$image"

for attempt in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready >/dev/null; then
    printf '%s\n' "$image" > "$app_dir/current-image"
    [[ -z "$previous_image" ]] || printf '%s\n' "$previous_image" > "$app_dir/previous-image"
    exit 0
  fi
  sleep 2
done

docker logs "$current_name" --tail 200 >&2 || true
docker rm -f "$current_name" >/dev/null 2>&1 || true
if [[ -n "$previous_image" ]]; then
  docker run -d --name "$current_name" \
    --env-file "$env_file" \
    -e APP_RELEASE="${previous_image##*:}" \
    -p 127.0.0.1:3000:3000 \
    --restart=unless-stopped \
    --log-driver=json-file \
    --log-opt max-size=50m \
    --log-opt max-file=5 \
    "$previous_image"
fi
exit 1

