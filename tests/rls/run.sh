#!/usr/bin/env bash
# Runs the migration + RLS tests on a throwaway local PostgreSQL database.
# Usage: bash tests/rls/run.sh   (needs psql access, e.g. as the postgres user)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=hisn_rls_test
PSQL="psql -v ON_ERROR_STOP=1 -q"
dropdb --if-exists "$DB" && createdb "$DB"
$PSQL -d "$DB" -f tests/rls/auth-shim.sql
for f in supabase/migrations/*.sql; do $PSQL -d "$DB" -f "$f"; done
$PSQL -d "$DB" -f tests/rls/grants.sql
$PSQL -d "$DB" -f tests/rls/rls.test.sql
dropdb "$DB"
echo "All RLS tests passed."
