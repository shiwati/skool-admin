#!/usr/bin/env bash
# Runs locally what the GitHub workflows run on a PR (ci.yml, migrations.yml,
# e2e.yml), so problems show up before pushing. Every step runs even if an
# earlier one fails; a summary at the end lists the results.
#
#   npm run ci:local                 # everything
#   npm run ci:local -- --no-e2e     # skip Playwright (the slowest step)
#   npm run ci:local -- --install    # start with `npm ci`, like CI does
#
# Migrations and E2E need the local Postgres (`npm run services:up`). The
# migration check uses a throwaway `skool_admin_ci` database that it drops at
# the end; E2E uses its own `_e2e` database (see docs/testing.md). The
# development database is never touched.

set -uo pipefail

cd "$(dirname "$0")/.."

RUN_E2E=1
RUN_INSTALL=0
for arg in "$@"; do
	case "$arg" in
	--no-e2e) RUN_E2E=0 ;;
	--install) RUN_INSTALL=1 ;;
	-h | --help)
		sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
		exit 0
		;;
	*)
		echo "Unknown option: $arg (see --help)" >&2
		exit 2
		;;
	esac
done

# Must match the `specs` job in .github/workflows/ci.yml.
OPENSPEC_VERSION="2.1.1"

# Placeholder values that only satisfy the env schema, as in ci.yml.
PLACEHOLDER_ENV=(
	NEXTAUTH_SECRET=ci-only-placeholder-not-a-real-secret-0123456789
	GOOGLE_CLIENT_ID=ci-placeholder
	GOOGLE_CLIENT_SECRET=ci-placeholder
	AUTH_ALLOWED_DOMAIN=example.org
	REPORT_TEMPLATE_DOC_ID=ci-placeholder
	DATABASE_URL_POOLED=
	NEXT_TELEMETRY_DISABLED=1
)

# Credentials from compose.yaml (local only).
PG_USER=skool
MIGRATIONS_DB=skool_admin_ci
MIGRATIONS_URL="postgresql://skool:local-development-only@localhost:5432/${MIGRATIONS_DB}?schema=public"

if [ -t 1 ]; then
	BOLD=$'\e[1m' GREEN=$'\e[32m' RED=$'\e[31m' YELLOW=$'\e[33m' RESET=$'\e[0m'
else
	BOLD="" GREEN="" RED="" YELLOW="" RESET=""
fi

RESULTS=()
FAILED=0

record() { # name status seconds
	RESULTS+=("$1|$2|$3")
	[ "$2" = FAIL ] && FAILED=1
}

step() { # name command...
	local name="$1"
	shift
	echo
	echo "${BOLD}▶ ${name}${RESET}"
	local start=$SECONDS
	if "$@"; then
		record "$name" PASS $((SECONDS - start))
	else
		record "$name" FAIL $((SECONDS - start))
	fi
}

skip() { # name reason
	echo
	echo "${YELLOW}↷ $1 skipped: $2${RESET}"
	record "$1" SKIP 0
}

psql_admin() {
	docker compose exec -T postgres psql -U "$PG_USER" -d postgres -v ON_ERROR_STOP=1 -q -c "$1"
}

postgres_up() {
	docker compose exec -T postgres pg_isready -U "$PG_USER" -q >/dev/null 2>&1
}

drop_migrations_db() {
	psql_admin "DROP DATABASE IF EXISTS ${MIGRATIONS_DB} WITH (FORCE)" >/dev/null 2>&1 || true
}

check_migrations() {
	drop_migrations_db
	psql_admin "CREATE DATABASE ${MIGRATIONS_DB}" || return 1
	local ok=0
	DATABASE_URL="$MIGRATIONS_URL" npx prisma migrate deploy || ok=1
	if [ $ok -eq 0 ]; then
		DATABASE_URL="$MIGRATIONS_URL" npx prisma migrate diff \
			--from-config-datasource --to-schema prisma/schema.prisma --exit-code || ok=1
	fi
	drop_migrations_db
	return $ok
}

port_free() {
	! lsof -nP -iTCP:3100 -sTCP:LISTEN >/dev/null 2>&1
}

# --- Setup (.github/actions/setup) -------------------------------------------

if [ $RUN_INSTALL -eq 1 ]; then
	step "npm ci" npm ci
fi

# --- ci.yml: checks -----------------------------------------------------------

step "Format" npm run format:check
step "Lint" npm run lint
step "Typecheck" npm run typecheck
step "Test" npm test

# --- ci.yml: build -------------------------------------------------------------

step "Build" env "${PLACEHOLDER_ENV[@]}" \
	DATABASE_URL=postgresql://ci:ci@localhost:5432/ci \
	NEXTAUTH_URL=http://localhost:3000 \
	npm run build

# --- ci.yml: specs -------------------------------------------------------------

step "OpenSpec validate" npx --yes "@fission-ai/openspec@${OPENSPEC_VERSION}" \
	validate --all --strict --no-interactive

# --- migrations.yml and e2e.yml (need Postgres) ----------------------------------

if postgres_up; then
	step "Migrations" check_migrations
	if [ $RUN_E2E -eq 0 ]; then
		skip "E2E" "--no-e2e"
	elif ! port_free; then
		record "E2E" FAIL 0
		echo "${RED}E2E: port 3100 is in use; stop that server first.${RESET}"
	else
		# CI=1 like on GitHub: fails on test.only, retries once, never reuses a
		# running server.
		step "E2E" env "${PLACEHOLDER_ENV[@]}" CI=1 npm run test:e2e
	fi
else
	echo
	echo "${RED}Local Postgres is not running: start it with \`npm run services:up\`.${RESET}"
	record "Migrations" FAIL 0
	if [ $RUN_E2E -eq 1 ]; then record "E2E" FAIL 0; else skip "E2E" "--no-e2e"; fi
fi

# --- Summary -------------------------------------------------------------------

echo
echo "${BOLD}Summary${RESET}"
for row in "${RESULTS[@]}"; do
	IFS='|' read -r name status secs <<<"$row"
	case "$status" in
	PASS) color=$GREEN ;;
	FAIL) color=$RED ;;
	*) color=$YELLOW ;;
	esac
	printf "  %s%-4s%s  %-18s %4ss\n" "$color" "$status" "$RESET" "$name" "$secs"
done

if [ $FAILED -ne 0 ]; then
	echo "${RED}${BOLD}Not ready for a PR.${RESET}"
	exit 1
fi
if [ $RUN_E2E -eq 0 ]; then
	echo "${YELLOW}${BOLD}Passed, but E2E was skipped.${RESET}"
else
	echo "${GREEN}${BOLD}All checks passed.${RESET}"
fi
