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

Dependencies and the lockfile are pinned. npm 12's `allowScripts` policy explicitly approves the required dependency installers, including Prisma and native tooling. Review and update those approvals with `npm install-scripts` when upgrading dependencies rather than allowing all lifecycle scripts.

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
    data-table.tsx
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
docker/pgadmin/servers.json
tests/
  setup.ts
  server-only.ts
```

Unit tests are colocated with the code they exercise. Add only necessary application folders as features emerge.

## Environment and startup

Copy `.env.example` to `.env` for local development. Next.js loads it automatically; Prisma CLI and seed commands load it through `dotenv`.

| Variable          | Requirement                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection URL                                         |
| `NEXTAUTH_SECRET` | Random secret, at least 32 characters                             |
| `NEXTAUTH_URL`    | Canonical HTTP(S) application URL                                 |
| `NODE_ENV`        | `development`, `test`, or `production`; defaults to `development` |
| `LOG_LEVEL`       | Pino level; defaults to `info`                                    |

Server startup validates environment values via `src/instrumentation.ts`; invalid configuration fails explicitly without printing secrets. Server modules also validate on import. Supply the required variables during builds too, because Next.js evaluates server modules when building route metadata. `npm ci` and Prisma client generation do not require secrets or a running database.

Environment values are server-only. Add a separate, explicitly public schema if browser configuration is needed in the future. Do not expose secrets using `NEXT_PUBLIC_*`.

## Database

Only the standard `User`, `Account`, `Session`, and `VerificationToken` models used by the authentication adapter are included. They are infrastructure, not business entities. The initial migration is committed.

```sh
npm run db:generate
npm run db:migrate -- --name describe_change
npm run db:deploy
npm run db:seed
npm run db:studio
```

Use `db:migrate` when authoring schema changes locally and commit the resulting migrations. Use `db:deploy` in deployment automation; do not use `db push` or `migrate dev` in production. Seeding is explicit, idempotent infrastructure and creates no users or application data.

The client uses Prisma's PostgreSQL driver adapter with a bounded connection pool and development hot-reload reuse. The `prisma-client-js` generator preserves compatibility with the stable v4 authentication adapter's `@prisma/client` types.

## Authentication

`src/lib/auth.ts` configures the Prisma adapter and database-backed sessions. The Route Handler exposes `/api/auth/*`. **No authentication provider is enabled**, so sign-in is deliberately unavailable.

When authentication requirements are defined, configure approved providers and their validated environment values. Use `getServerSession(authOptions)` in server-only code where needed. Authentication alone does not grant authorization: enforce authorization in every protected Route Handler, Server Action, and server-rendered resource. No business-specific callbacks, roles, credential flows, or public registration are implemented.

NextAuth.js v4 is intentionally used instead of the v5 beta. Plan and test a deliberate migration when the modern Auth.js integration becomes stable.

## Shared UI and validation

- Tailwind CSS v4 uses CSS-first configuration and semantic theme tokens in `src/app/globals.css`.
- `components.json` configures shadcn/ui aliases and the neutral theme. `src/components/ui` contains locally owned primitives. Add components using `npx shadcn@latest add <component>`.
- Lucide supplies icons. Client Components are limited to interactive boundaries.
- `DataTable` supplies typed TanStack columns, client-side sorting, accessible markup, empty state, and pagination. It is intended for bounded datasets; introduce server-side pagination when actual requirements warrant it.
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
```

Vitest uses Testing Library for interactive components and mocks external boundaries. Unit tests cover configuration validation, the table, form resolver integration, validation formatting, and health responses.

Husky runs lint-staged on pre-commit. It formats and lints only staged files; the full checks remain required before release.

ESLint 9 is pinned to match the supported peer ranges of the plugins bundled by `eslint-config-next`; do not force ESLint 10 until those plugins declare compatibility.

## CI and deployment

No CI vendor or workflow is configured yet. A future pipeline can use:

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Provide validated environment variables to build and runtime.

For production, provision managed/external PostgreSQL, configure secret management and TLS at your hosting platform, run migrations as a release step, and start with `npm start` after `npm run build`. The runtime needs Node.js, production dependencies, the generated Prisma client, and the Next.js build. Local Compose configuration is not a production deployment strategy.
