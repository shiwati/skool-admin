# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Single Next.js 16 App Router app (React 19, TypeScript, Tailwind v4, Prisma 7 + PostgreSQL, NextAuth.js v4). It is an admin app for Skool events and their applicants. Admin UI: dashboard (`/`), Jelentkezők (list, detail, edit, duplicate review/merge, CSV export), Programok (list, create/edit, overview with applicants/bulk status, Google Sheet import, feedback and closing-report tabs), Visszajelzések (`/feedback`), Riportok (`/reports`, Google Doc from a template) and change history (`/history/[id]`). Every implemented feature has an OpenSpec spec in `openspec/specs/` (`openspec list --specs`) — **read the relevant spec before changing behavior**, and add features only as requirements arrive, via an OpenSpec change. The README is the authoritative setup doc. **Start with `docs/README.md`** (Hungarian knowledge base: domain, API, auth; `docs/gaps-and-decisions.md` holds open questions, known quirks and the decision log).

## Commands

```sh
npm run services:up        # start local Postgres (:5432) + pgAdmin (:5050) via Docker Compose
npm run dev                # app runs on the host, not in Docker (http://localhost:3000)
npm run lint               # eslint, --max-warnings=0
npm run typecheck          # prisma generate + next typegen + tsc --noEmit
npm test                   # vitest run (all)
npx vitest run src/lib/utils.test.ts      # single file
npx vitest run -t "returns readiness"     # single test by name
npm run test:e2e           # Playwright E2E: builds, serves on :3100, own *_e2e DB (needs services:up; once: npx playwright install chromium)
npm run ci:local           # before a PR: everything GitHub CI runs (ci, migrations, e2e); --no-e2e, --install
npm run format:check
npm run build              # prisma generate + next build (needs valid env vars)
npm run db:migrate -- --name describe_change   # author a migration; commit it
npm run db:deploy          # apply migrations (deploy/CI); never `db push` or `migrate dev` in prod
npm run vercel-build       # Vercel build command (vercel.json): build, then migrate deploy only if VERCEL_ENV=production
```

First-time setup: `cp .env.example .env`, set `NEXTAUTH_SECRET` (≥32 chars, `openssl rand -base64 32`), `npm ci`, `services:up`, `db:deploy`, `db:seed`.

Husky pre-commit runs lint-staged (eslint --fix + prettier on staged files; `prisma format` on `.prisma`). Prettier uses **tabs** and sorts Tailwind classes.

Toolchain is pinned: Node 26 / npm 11.20.0 (Volta), exact dependency versions, and an `allowScripts` allowlist in `package.json` for install scripts — update it via `npm install-scripts` when upgrading deps. ESLint is deliberately held at v9 (plugin peer ranges); don't bump to 10.

## Architecture

- **Environment**: `src/lib/env-schema.ts` (Zod schema, pure, testable) → `src/lib/env.ts` (parses `process.env`, `server-only`). Validation also runs at startup via `src/instrumentation.ts`. Env is server-only; never expose secrets via `NEXT_PUBLIC_*` — add a separate public schema if browser config is ever needed. New variables go in the schema, `.env.example`, and the README table.
- **Database**: `src/lib/db.ts` exports a singleton `db` (PrismaClient with `@prisma/adapter-pg` pool, reused across dev hot reloads). Generator is `prisma-client-js` for compatibility with `@next-auth/prisma-adapter`. Schema holds the NextAuth models plus the domain models (`Applicant`, `Application`, `Event`, `Feedback`, `History`, `DuplicateDismissal`, `EventReport`, `EventReportDocument`). GDPR deletion never hard-deletes: it anonymizes the applicant and sets `deletedAt` (`src/lib/applicants/anonymize.ts`), so queries that list or show people must filter `deletedAt: null` — but **statistics must not** (anonymized applicants keep counting). The one intentional hard delete is duplicate merge: the merged applicant's applications and History move to the kept one, then it is deleted. Prisma CLI config is in `prisma.config.ts`. Production migrations run in the Vercel build (`vercel-build`, production only), before the new deployment is promoted — so **every migration must be backward compatible with the currently deployed code** (expand/contract; drop/rename in a later deploy). `vercel.json` also sets `ignoreCommand` so **only `main` builds on Vercel**; other branches deploy only by hand, and a manual `--prod` deploy migrates production too. PRs to `main`/`develop` run `.github/workflows/migrations.yml` (apply all migrations to an empty Postgres, then `prisma migrate diff --exit-code` against `schema.prisma`), so never change `schema.prisma` without committing its migration. `.github/workflows/ci.yml` runs format, lint, typecheck, tests, build (placeholder env) and `openspec validate --all --strict` on the same PRs — run those locally before pushing. Two connection URLs: `DATABASE_URL` is the direct one (Prisma CLI/migrations, seed); the optional `DATABASE_URL_POOLED` feeds the runtime adapter in `db.ts` and falls back to `DATABASE_URL`. The seed (`prisma/seed.ts`, `npm run db:seed` / `db:seed:reset`) loads **local-only sample data** from `prisma/seed-data/local.json` (gitignored) or `sample.json`; it refuses to run unless `DATABASE_URL` is localhost and `NODE_ENV` is not production. Production data comes from the in-app Google Sheet import (`/api/events/[id]/sync`), never from the seed. See `docs/data-and-db.md`.
- **Auth**: `src/lib/auth.ts` (`authOptions`, Prisma adapter, database sessions) served at `src/app/api/auth/[...nextauth]/route.ts`; sign-in page is `src/app/login/`. **Google is the only provider.** Access = any member of the Skool Google Workspace: the OAuth client's consent screen is **Internal** (Google blocks outsiders), and the `signIn` callback double-checks server-side via the pure `evaluateSignIn` in `src/lib/access-policy.ts` (verified email + `hd` claim + email domain == `AUTH_ALLOWED_DOMAIN`). There is **no per-user allowlist**; don't add one. Denials return `/login?error=AccessDenied&account=…` before any DB write. Stay on NextAuth v4 (not the v5 beta).
- **Protecting things**: use `src/lib/session.ts`. Pages go under `src/app/(admin)/`, whose layout calls `requireAdmin(returnTo)` (redirects to `/login?callbackUrl=…`). **Layouts do not protect Route Handlers or Server Actions**: each one must check the session itself — read routes via `handleQuery`, write routes via `handleBody` / `handleAdmin` (`src/lib/api/handler.ts`), anything else by calling `getAdminSession()` and rejecting on `null`. `/login`, `/api/auth/*` and `/api/health` stay public, outside `(admin)`. Auth events log only `{ event, userId }` / `{ event, reason }`, never emails or tokens.
- **Logging**: `src/lib/logger.ts` (Pino; JSON in prod, pino-pretty in dev, with redaction). Don't log sessions, credentials, user records, or request bodies.
- **Health**: `GET /api/health` is a readiness check (`SELECT 1`), returns 200/503, `no-store`, never leaks error details.
- **UI**: Server Components by default; Client Components only at interactive boundaries. shadcn/ui primitives live in `src/components/ui` (add with `npx shadcn@latest add <component>`), theme tokens in `src/app/globals.css`. Shared pieces: server-paginated list pieces (`src/lib/list-state.ts` for URL state, `src/components/list/` for sortable headers, state rows and `EmptyState`, `usePagedQuery` for client fetching), `ChartContainer` (Recharts wrapper with accessible labelling), `useZodForm` (React Hook Form + Zod resolver), `formatValidationErrors` in `src/lib/validation.ts` for server-side validation errors — always validate on the server too.
- `pino`, `pino-pretty`, and Prisma packages are in `serverExternalPackages` in `next.config.ts`.

## Testing

Vitest + Testing Library, jsdom by default; tests are colocated as `src/**/*.test.{ts,tsx}` (only that glob is picked up). `server-only` is aliased to a no-op stub (`tests/server-only.ts`) so server modules are importable. Server/route tests opt into node with `// @vitest-environment node` and mock external boundaries (`@/lib/db`, `@/lib/logger`) via `vi.hoisted` + `vi.mock` — see `src/app/api/health/route.test.ts`. No Vitest test hits a real database.

E2E: Playwright in `e2e/*.spec.ts` (config `playwright.config.ts`) runs the production build on port 3100 against a separate local `*_e2e` database that `e2e/auth.setup.ts` migrates, **empties** and fills from `e2e/support/fixtures.ts` on every run; sign-in is a seeded NextAuth `Session` row + cookie (no test auth provider). Keep fixtures deterministic (no dates relative to now). Tests in `e2e/*.spec.ts` only read the shared fixtures; tests that write go in `e2e/writes/` (the `writes` project, run after the readers) and create their own data with the `factory` fixture from `e2e/support/test.ts`. CI runs it in `.github/workflows/e2e.yml` (PRs and pushes to `main`/`develop`). See `docs/testing.md`.

When to run E2E (it builds the app, so not after every edit): in an OpenSpec change, only once in the final Verification task — `openspec/config.yaml` (`rules.tasks`, `operations.apply`/`archive` guidance) wires this in. Outside a change: run the affected `e2e/*.spec.ts` when touching admin UI, pages or API routes, and the full `npm run test:e2e` before commit/push of such work; skip for spec/docs-only or pure lib changes. If local Postgres is down, don't start it — say E2E was skipped.

## Specs and skills

- `openspec/` holds OpenSpec spec-driven change workflow (`openspec/changes`, `openspec/specs`); the `openspec-*` skills drive exploring, proposing, applying, verifying and archiving changes. Specs are written in English with Hungarian UI strings quoted verbatim.

### Keep specs and docs in sync (always, even without OpenSpec commands)

Every task that changes behavior — a feature, bug fix, UI text, API, validation, data rule — must leave the specs and docs matching the code, whether or not the user invoked an `openspec-*` skill:

1. **Before coding**, find the affected capability (`openspec list --specs`, then read `openspec/specs/<capability>/spec.md`) and work to it. If the request contradicts a spec requirement, say so and ask which one wins before changing code.
2. **New feature or behavior change** → propose an OpenSpec change (`openspec-propose`) and let the user review it, unless they say to skip it. **Small fixes** that restore behavior the spec already describes need no change.
3. **Behavior changed without a change folder** (user said skip, or a quick fix altered behavior) → update the main spec directly in the same task: edit the requirement and its scenarios, keep `openspec validate --all --strict` passing (CI enforces it; requirement text stays under 500 characters).
4. **Docs**: update the affected `docs/*.md` file (API endpoints in `docs/api.md`, data rules in `docs/data-and-db.md`, entities in `docs/domain.md`, UI conventions in `docs/frontend.md`); record decisions, deferred questions and known quirks in `docs/gaps-and-decisions.md`; update this file when a rule here changes.
5. **Tests**: each scenario you add or change gets a test.
6. **When done**, state in one line which specs and docs you updated, or why none needed it.

Pure refactors, dependency bumps and test-only work need no spec change, but still fix any docs they make stale.

- `.claude/skills/` (mirrored in `.agents/skills/`) contains Next.js skills (dev loop, bundle optimizer, Cache Components / Partial Prefetching adoption). Installed skills are tracked in `skills-lock.json`.
