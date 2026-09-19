#!/usr/bin/env bash
set -euo pipefail

readonly app_image="${1:?application image is required}"
readonly migrator_image="${2:?migrator image is required}"
readonly region="${ALIYUN_REGION:-cn-hangzhou}"
readonly registry="${app_image%%/*}"
readonly kms_secret_name="${KMS_SECRET_NAME:?KMS_SECRET_NAME is required}"

if [[ ! "$kms_secret_name" =~ ^[[:alnum:]._:/-]+$ ]]; then
  echo "invalid KMS secret name" >&2
  exit 64
fi

auth_json=$(aliyun cr GetAuthorizationToken --RegionId "$region")
username=$(jq -r '.UserName' <<<"$auth_json")
token=$(jq -r '.AuthorizationToken' <<<"$auth_json")
printf '%s' "$token" | docker login "$registry" --username "$username" --password-stdin
/opt/sinan/sync-web-secrets.sh "$kms_secret_name" /opt/sinan/web.env
/opt/sinan/deploy-web.sh "$app_image" "$migrator_image"
