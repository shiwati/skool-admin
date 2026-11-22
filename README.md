# Application foundation

A single Next.js App Router application with TypeScript, React Server Components by default, PostgreSQL, Prisma, and stable NextAuth.js v4 (the stable release of the Auth.js project). There is no monorepo or business functionality.

## Requirements

- [Volta](https://volta.sh) selects the exact Node.js LTS and compatible npm versions in `package.json`.
- Docker with Compose v2 for **local development infrastructure only**.

## Optional repository-local Git credentials

Git does not automatically load configuration from a cloned repository. To use
the tracked [`.gitconfig`](./.gitconfig), place a `.git-credentials` file in the
repository root, then run this once after cloning:

```sh
chmod 600 .git-credentials
git config --local --add include.path "$(git rev-parse --show-toplevel)/.gitconfig"
```

Normal `git push`, `git pull`, and `git fetch` commands will then use this file
instead of other credential helpers, including the macOS Keychain. This applies
only to this checkout and also works from its subdirectories. Use an HTTPS
remote; downloading a ZIP does not create a Git checkout.

The credentials file is ignored by Git but stores tokens in plaintext. Never
commit it or send it through an insecure channel. Prefer each collaborator's own
token and grant their GitHub account repository access rather than sharing a
personal token. Push access depends on the token owner's repository permissions
and the token's scopes.

## Quicker start

```sh
npm run dev:all
```

## Quick start

```sh
cp .env.example .env
openssl rand -base64 32
# Put the generated value in NEXTAUTH_SECRET in .env.
npm ci
npm run services:up
npm run db:deploy
npm run db:seed
npm run dev
```

Husky hooks are installed by `npm ci` in a Git checkout. If copying the skeleton without `.git`, run `git init` and `npm run prepare` to enable hooks. The skeleton has no initial commit.

Open <http://localhost:3000>. PostgreSQL is available on localhost:5432. pgAdmin is at <http://localhost:5050> with a preconfigured server. Its local-only credentials and the PostgreSQL password are `local-development-only`; the pgAdmin email is `admin@example.com`. If prompted for the server password, use the PostgreSQL password. These credentials must never be reused outside local development.

The application runs on the host, not in Docker. Compose binds published ports to loopback and keeps database/UI data in named volumes. `npm run services:down` stops the services without deleting data. No production Dockerfile or Compose deployment is supplied.

Dependencies and the lockfile are pinned. npm 11.20.0 matches Vercel's bundled npm version. The `allowScripts` policy explicitly approves the required dependency installers, including Prisma and native tooling. Review and update those approvals with `npm install-scripts` when upgrading dependencies rather than allowing all lifecycle scripts.

## Structure

```text
src/
  app/
    api/
      auth/[...nextauth]/route.ts
      health/route.ts
    error.tsx
    globals.css
    layout.tsx
    not-found.tsx
    page.tsx
  components/
    charts/chart-container.tsx
    ui/button.tsx
    list/                  shared pieces for server-paginated tables
  hooks/use-zod-form.ts
  lib/
    auth.ts
    db.ts
    env-schema.ts
    env.ts
    logger.ts
    utils.ts
    validation.ts
  instrumentation.ts
prisma/
  migrations/
  schema.prisma
  seed.ts
  seed-data/
    sample.json
docker/pgadmin/servers.json
tests/
  setup.ts
  server-only.ts
e2e/                  # Playwright end-to-end tests (own database, see below)
playwright.config.ts
```

Unit tests are colocated with the code they exercise. Add only necessary application folders as features emerge.

## Environment and startup

Copy `.env.example` to `.env` for local development. Next.js loads it automatically; Prisma CLI and seed commands load it through `dotenv`.

| Variable                 | Requirement                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Direct (non-pooled) PostgreSQL URL; used by migrations, Prisma Studio and the seed            |
| `DATABASE_URL_POOLED`    | Optional pooled PostgreSQL URL for the app at runtime; falls back to `DATABASE_URL`           |
| `NEXTAUTH_SECRET`        | Random secret, at least 32 characters                                                         |
| `NEXTAUTH_URL`           | Canonical HTTP(S) application URL                                                             |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID (see [Authentication](#authentication))                                |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret                                                                    |
| `AUTH_ALLOWED_DOMAIN`    | Google Workspace domain allowed to sign in, e.g. `skool.org.hu`; no default                   |
| `REPORT_TEMPLATE_DOC_ID` | Google Doc ID of the closing-report template (see `docs/plans/report-google-doc-template.md`) |
| `NODE_ENV`               | `development`, `test`, or `production`; defaults to `development`                             |
| `LOG_LEVEL`              | Pino level; defaults to `info`                                                                |

Server startup validates environment values via `src/instrumentation.ts`; invalid configuration fails explicitly without printing secrets. Server modules also validate on import. Supply the required variables during builds too, because Next.js evaluates server modules when building route metadata. `npm ci` and Prisma client generation do not require secrets or a running database.

Environment values are server-only. Add a separate, explicitly public schema if browser configuration is needed in the future. Do not expose secrets using `NEXT_PUBLIC_*`.

## Database

The schema contains the standard `User`, `Account`, `Session`, and `VerificationToken` models used by the authentication adapter, plus the domain models `Applicant`, `Application`, `Event`, and `History`. All migrations are committed.

```sh
npm run db:generate
npm run db:migrate -- --name describe_change
npm run db:deploy
npm run db:seed
npm run db:seed:reset
npm run db:studio
```

Use `db:migrate` when authoring schema changes locally and commit the resulting migrations. Use `db:deploy` in deployment automation; do not use `db push` or `migrate dev` in production.

### Local sample data

`db:seed` loads sample events, applicants and applications into your **local** database so there is something to work with. It is idempotent (upserts by id); `db:seed:reset` first deletes all rows of those three tables, then reloads. `npm run dev:all` also runs `db:seed`, which resets seeded rows to the file's state on every start.

- `prisma/seed-data/sample.json` is committed and contains made-up data. It is used by default.
- `prisma/seed-data/local.json` is **optional and gitignored**. If it exists, the seed uses it instead of `sample.json`. Use it for your own data set (for example a real export you were given) without risking committing personal data. Same format as `sample.json`: `events`, `applicants`, `applications`, linked by the ids you give them.
- The seed refuses to run when `NODE_ENV=production` or when `DATABASE_URL` does not point at `localhost`, `127.0.0.1` or `::1`, so it cannot touch a production database. It is never part of `db:deploy`, the build or CI. Production data will be loaded by the application itself in a later phase, not by the seed.

### Inspecting the database

To see what is currently in your local database (the local Postgres must be running: `npm run services:up`):

- **Prisma Studio**: `npm run db:studio` opens a browser UI (usually <http://localhost:5555>) where you can browse, filter and edit rows table by table (`Applicant`, `Application`, `Event`, `History`, …). The quickest way to check what the seed or the app wrote.
- **pgAdmin**: <http://localhost:5050> (started by `services:up`, credentials in [Quick start](#quick-start)). Use it for ad-hoc SQL queries, inspecting indexes and constraints, or exporting data.
- **psql**: for a one-off query, for example `psql "$DATABASE_URL" -c 'SELECT count(*) FROM "Applicant";'`.

Both tools use `DATABASE_URL` from `.env` (Prisma Studio) or the preconfigured server (pgAdmin). Pointing `DATABASE_URL` at a shared or production database also works, but treat it as read-only there: Studio edits take effect immediately and are not reversible.

The client uses Prisma's PostgreSQL driver adapter with a bounded connection pool and development hot-reload reuse. The `prisma-client-js` generator preserves compatibility with the stable v4 authentication adapter's `@prisma/client` types.

## Authentication

`src/lib/auth.ts` configures the Prisma adapter, database-backed sessions and **Google as the only sign-in method**. The Route Handler exposes `/api/auth/*`; the sign-in page is `/login`. There are no passwords, email links or public registration.

### Google OAuth client

1. In a Google Cloud project **owned by the Skool Workspace organisation**, create an OAuth client of type _Web application_.
2. Set the OAuth consent screen user type to **Internal**. Google then blocks every account outside the organisation on its own page, before the app is reached.
3. Add the authorised redirect URI `<NEXTAUTH_URL>/api/auth/callback/google` for each environment (locally `http://localhost:3000/api/auth/callback/google`).
4. Put the client ID and secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and the Workspace domain in `AUTH_ALLOWED_DOMAIN`.

### Who can sign in

Every member of the Workspace organisation can sign in; access is managed in Google Workspace (add or suspend users there). There is **no app-side allowlist**. As a fail-closed safeguard, `src/lib/access-policy.ts` also checks on the server that Google reports a verified email and that both the Workspace hosted-domain (`hd`) claim and the email domain equal `AUTH_ALLOWED_DOMAIN`. A consumer Google account registered with a Workspace address has no `hd` claim and is denied. Denied attempts create no `User`, `Account` or `Session` rows.

### Protecting pages and endpoints

Pages under `src/app/(admin)/` are guarded by its layout (`requireAdmin`). Layouts do not protect Route Handlers or Server Actions: call `getAdminSession()` from `src/lib/session.ts` in each one and reject when it returns `null`.

### Offboarding

Suspending a user in Workspace blocks new sign-ins, but an existing session stays valid until it expires (30 days by default). To cut someone off immediately, delete their `Session` rows (for example in `npm run db:studio`).

NextAuth.js v4 is intentionally used instead of the v5 beta. Plan and test a deliberate migration when the modern Auth.js integration becomes stable.

## Shared UI and validation

- Tailwind CSS v4 uses CSS-first configuration and semantic theme tokens in `src/app/globals.css`.
- `components.json` configures shadcn/ui aliases and the neutral theme. `src/components/ui` contains locally owned primitives. Add components using `npx shadcn@latest add <component>`.
- Lucide supplies icons. Client Components are limited to interactive boundaries.
- Lists are paginated on the server. `src/lib/list-state.ts` holds the shared URL state helpers, `src/components/list/` the sortable headers, state rows and empty states, and `usePagedQuery` the client-side page fetch.
- `ChartContainer` provides a labelled responsive Recharts boundary. Supply accessible chart content and textual/tabular alternatives when adding real charts.
- `useZodForm` connects React Hook Form to Zod, including input/output transforms. `formatValidationErrors` produces reusable field/form errors for server validation. Validate submitted data on the server as well as in the browser.

No example forms, dashboards, charts with fake business data, or business entities are included.

## Logging and health

Pino writes structured JSON to stdout in production and readable `pino-pretty` output in development. Core credential/header paths are redacted; never log raw session objects, credentials, connection strings, user records, or request bodies. Redaction is a safeguard, not a substitute for selecting safe log fields.

`GET /api/health` is a non-cached **readiness** check: it queries PostgreSQL and returns HTTP 200 with `{"status":"ok","checks":{"database":"up"}}`, or HTTP 503 with database `down`. Failure details are logged server-side and never returned. Keep dependency-sensitive readiness checks separate from liveness checks if your hosting platform needs both.

## Quality and tests

```sh
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run format:check
npm run build
npm run test:e2e        # Playwright, needs services:up (see below)
```

Vitest uses Testing Library for interactive components and mocks external boundaries. Unit tests cover configuration validation, the table, form resolver integration, validation formatting, and health responses.

### End-to-end tests

Playwright drives the real app in Chromium. One-time setup: `npx playwright install chromium`. With the local Postgres running (`npm run services:up`), `npm run test:e2e` builds the app, starts it on port 3100 (so it does not clash with `npm run dev` on 3000) and runs `e2e/*.spec.ts`; `npm run test:e2e:ui` opens the interactive runner.

The tests use their own database, `<DATABASE_URL database>_e2e` on the same server (override with `E2E_DATABASE_URL`). Before every run the setup project creates it if needed, applies the migrations, **empties it** and loads the fixtures from `e2e/support/fixtures.ts`. It refuses any database that is not local or whose name does not end in `_e2e`, so the development data is never touched. Sign-in needs no Google account: the setup writes a NextAuth `Session` row and hands its cookie to the browser. CI runs them in `.github/workflows/e2e.yml` with a throwaway Postgres service.

Husky runs lint-staged on pre-commit. It formats and lints only staged files; the full checks remain required before release.

ESLint 9 is pinned to match the supported peer ranges of the plugins bundled by `eslint-config-next`; do not force ESLint 10 until those plugins declare compatibility.

## CI and deployment

Production runs on Vercel and deploys on every push to `main`. `vercel.json` sets an ignored build step (`ignoreCommand`: `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]`), so **only `main` builds automatically**; pushes to any other branch are skipped and other branches deploy only when started by hand. It also sets the build command to `npm run vercel-build`, which runs `prisma generate`, `next build` and then, **only when `VERCEL_ENV=production`**, `prisma migrate deploy` against `DATABASE_URL` (the direct connection). Preview builds never migrate. Migration runs after a successful `next build`, before the deployment is promoted, so:

- A failed build applies no migration; a failed migration fails the deployment and the previous one keeps serving. A partially applied, failed migration blocks every later `migrate deploy` until it is fixed by hand (`prisma migrate resolve`).
- For a short window the previous code runs against the new schema, and Instant Rollback never reverts the schema. Keep migrations backward compatible with the currently deployed code (expand/contract: add first, drop or rename in a later deploy).
- The Vercel Production environment needs `DATABASE_URL` (direct, non-pooled: migrations take an advisory lock that a transaction-mode pooler breaks) at build time and `DATABASE_URL_POOLED` at runtime. The database must accept connections from Vercel's build machines.

Because a manual production deploy (for example `vercel deploy --prod` from another branch) also has `VERCEL_ENV=production`, it migrates the production database too: deploy to production only from `main`.

GitHub Actions: `.github/workflows/migrations.yml` runs on every pull request to `main` or `develop`. It applies all migrations to an empty PostgreSQL 18 service container (`prisma migrate deploy`), then fails if `prisma/schema.prisma` differs from the migrated database (`prisma migrate diff --exit-code`, i.e. a schema change without a migration). Make it, and the CI jobs below, required status checks in the `main` branch protection rule so a broken change cannot reach production.

`.github/workflows/ci.yml` runs on pull requests to `main`/`develop` and on pushes to them, in three parallel jobs:

- **Format, lint, typecheck, test**: `npm run format:check`, `lint`, `typecheck`, `npm test`. Every step runs even if an earlier one fails, so one run reports all problems.
- **Build**: `npm run build` with placeholder env values that only satisfy the env schema (the build needs no database or Google access; never put real secrets there).
- **OpenSpec validate**: `openspec validate --all --strict` (specs and active changes; pinned `@fission-ai/openspec` via `npx`). Strict mode also fails on warnings, e.g. a requirement text over 500 characters: split it or move detail into scenarios.

Both workflows share `.github/actions/setup` (Node from `volta.node`, npm from `packageManager`, `npm ci`). Before opening a PR, `npm run ci:local` (`scripts/ci-local.sh`) runs the same checks locally: format, lint, typecheck, tests, build with the placeholder env, OpenSpec validation, the migration check (on a throwaway `skool_admin_ci` database it drops afterwards) and E2E with `CI=1`. It needs `npm run services:up`; `--no-e2e` skips Playwright, `--install` starts with `npm ci`. Every step runs even if one fails, and a summary lists the results.

For production, provision managed/external PostgreSQL, configure secret management and TLS at your hosting platform, run migrations as a release step (on Vercel this is `vercel-build`, see above), and start with `npm start` after `npm run build`. The runtime needs Node.js, production dependencies, the generated Prisma client, and the Next.js build. Local Compose configuration is not a production deployment strategy.
