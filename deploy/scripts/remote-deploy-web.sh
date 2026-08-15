#!/usr/bin/env bash
set -euo pipefail

readonly image="${1:?image is required}"
readonly region="${ALIYUN_REGION:-cn-hangzhou}"
readonly registry="${image%%/*}"

auth_json=$(aliyun cr GetAuthorizationToken --RegionId "$region")
username=$(jq -r '.UserName' <<<"$auth_json")
token=$(jq -r '.AuthorizationToken' <<<"$auth_json")
printf '%s' "$token" | docker login "$registry" --username "$username" --password-stdin
/opt/sinan/deploy-web.sh "$image"

