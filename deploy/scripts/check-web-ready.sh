#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:?HTTPS application URL is required}"
readonly health_url="${base_url%/}/api/health/ready"

if [[ "$base_url" != https://* ]]; then
  echo "external production probe requires an HTTPS URL" >&2
  exit 64
fi
command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 69; }
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 69; }

response_file=$(mktemp)
cleanup() {
  rm -f "$response_file"
}
trap cleanup EXIT

status=$(curl --silent --show-error --location --max-time 10 \
  --retry 2 --retry-delay 1 --output "$response_file" \
  --write-out '%{http_code}' "$health_url")
if [[ "$status" != "200" ]]; then
  echo "ready probe failed with HTTP $status: $health_url" >&2
  exit 1
fi

jq -e '.status == "ready" and .configuration == "valid" and .database == "reachable"' \
  "$response_file" >/dev/null
echo "ready probe passed: $health_url"
