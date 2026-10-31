#!/usr/bin/env bash
set -euo pipefail

# Fetch the production .env payload from Alibaba Cloud KMS Secrets Manager.
# The ECS RAM instance role must have kms:GetSecretValue for this one secret.
# SecretData is deliberately never printed, logged, or written to stdout.

readonly secret_name="${1:?KMS secret name is required}"
readonly target_file="${2:-/opt/sinan/web.env}"
readonly region="${ALIYUN_REGION:-cn-hangzhou}"
readonly target_dir="$(dirname "$target_file")"

if [[ ! "$target_file" = /* || "$target_file" == */.. || "$target_file" == */../* ]]; then
  echo "target environment file must be an absolute path without parent traversal" >&2
  exit 64
fi

command -v aliyun >/dev/null 2>&1 || { echo "aliyun CLI is required" >&2; exit 69; }
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 69; }

install -d -m 0750 "$target_dir"
umask 077
tmp_file=$(mktemp "$target_dir/.web.env.XXXXXX")
cleanup() {
  rm -f "$tmp_file"
}
trap cleanup EXIT

if ! secret_response=$(aliyun kms GetSecretValue \
  --RegionId "$region" \
  --SecretName "$secret_name" \
  --VersionStage ACSCurrent 2>/dev/null); then
  echo "failed to read production secret from KMS" >&2
  exit 1
fi

if ! jq -e '.SecretData | type == "string" and length > 0' >/dev/null <<<"$secret_response"; then
  echo "KMS secret has no non-empty SecretData" >&2
  exit 1
fi
jq -r '.SecretData' <<<"$secret_response" > "$tmp_file"

required_keys=(
  NODE_ENV AUTH_SECRET DATABASE_ADAPTER DATABASE_URL CRON_SECRET
  MAIL_PROVIDER MAIL_FROM_DOMAIN ALIYUN_DM_ACCOUNT_NAME ALIYUN_DM_REGION
  ERROR_REPORTING_MODE NEXT_PUBLIC_APP_URL NEXT_PUBLIC_APP_ENV
  NEXT_PUBLIC_ICP_FILING_NUMBER NEXT_PUBLIC_API_ENABLED NEXT_PUBLIC_PULSE_ENABLED SUPPORT_EMAIL
  LAUNCH_SCOPE_ONLY INVITE_REQUIRED
)
for key in "${required_keys[@]}"; do
  if ! grep -Eq "^${key}=.+$" "$tmp_file"; then
    echo "KMS secret is missing a non-empty required variable: $key" >&2
    exit 1
  fi
done

if ! grep -Eq '^NODE_ENV=production[[:space:]]*$' "$tmp_file" \
  || ! grep -Eq '^DATABASE_ADAPTER=pg[[:space:]]*$' "$tmp_file" \
  || ! grep -Eq '^MAIL_PROVIDER=aliyun-direct-mail[[:space:]]*$' "$tmp_file" \
  || ! grep -Eq '^NEXT_PUBLIC_APP_ENV=production[[:space:]]*$' "$tmp_file" \
  || ! grep -Eq '^NEXT_PUBLIC_API_ENABLED=true[[:space:]]*$' "$tmp_file" \
  || ! grep -Eq '^NEXT_PUBLIC_PULSE_ENABLED=false[[:space:]]*$' "$tmp_file" \
  || ! grep -Eq '^LAUNCH_SCOPE_ONLY=true[[:space:]]*$' "$tmp_file" \
  || ! grep -Eq '^INVITE_REQUIRED=true[[:space:]]*$' "$tmp_file"; then
  echo "KMS secret does not satisfy the production environment contract" >&2
  exit 1
fi

chmod 0600 "$tmp_file"
mv -f "$tmp_file" "$target_file"
chmod 0600 "$target_file"
trap - EXIT
echo "production environment refreshed from KMS: $target_file"
