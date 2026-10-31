#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
migration_dir="$(cd "$script_dir/../src/db/migrations" && pwd)"

for migration in "$migration_dir"/*.sql; do
  echo "Applying $(basename "$migration")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
done

table_count="$(psql "$DATABASE_URL" -Atc "select count(*) from information_schema.tables where table_schema='public'")"
if [[ "$table_count" -lt 1 ]]; then
  echo "Migration verification produced no public tables" >&2
  exit 1
fi

echo "Migration SQL verified on PostgreSQL (${table_count} public tables)."
