# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Single Next.js 16 App Router app (React 19, TypeScript, Tailwind v4, Prisma 7 + PostgreSQL, NextAuth.js v4). It is an admin app for Skool events and their applicants. The domain model (`Applicant`, `Application`, `Event`, `History`) and three list endpoints (`/api/applicants`, `/api/events`, `/api/events/[id]/applicants`) exist so far, all GET (write endpoints are expected); there is no real admin UI yet. Add features only as requirements arrive. The README is the authoritative setup doc. **Start with `docs/README.md`** (Hungarian knowledge base: domain, API, auth, known gaps such as the missing domain migration).

## Commands

```sh
npm run services:up        # start local Postgres (:5432) + pgAdmin (:5050) via Docker Compose
npm run dev                # app runs on the host, not in Docker (http://localhost:3000)
npm run lint               # eslint, --max-warnings=0
npm run typecheck          # prisma generate + next typegen + tsc --noEmit
npm test                   # vitest run (all)
npx vitest run src/lib/utils.test.ts      # single file
npx vitest run -t "returns readiness"     # single test by name
npm run format:check
npm run build              # prisma generate + next build (needs valid env vars)
npm run db:migrate -- --name describe_change   # author a migration; commit it
npm run db:deploy          # apply migrations (deploy/CI); never `db push` or `migrate dev` in prod
```

First-time setup: `cp .env.example .env`, set `NEXTAUTH_SECRET` (≥32 chars, `openssl rand -base64 32`), `npm ci`, `services:up`, `db:deploy`, `db:seed`.

Husky pre-commit runs lint-staged (eslint --fix + prettier on staged files; `prisma format` on `.prisma`). Prettier uses **tabs** and sorts Tailwind classes.

Toolchain is pinned: Node 26 / npm 11.20.0 (Volta), exact dependency versions, and an `allowScripts` allowlist in `package.json` for install scripts — update it via `npm install-scripts` when upgrading deps. ESLint is deliberately held at v9 (plugin peer ranges); don't bump to 10.

## Architecture

- **Environment**: `src/lib/env-schema.ts` (Zod schema, pure, testable) → `src/lib/env.ts` (parses `process.env`, `server-only`). Validation also runs at startup via `src/instrumentation.ts`. Env is server-only; never expose secrets via `NEXT_PUBLIC_*` — add a separate public schema if browser config is ever needed. New variables go in the schema, `.env.example`, and the README table.
- **Database**: `src/lib/db.ts` exports a singleton `db` (PrismaClient with `@prisma/adapter-pg` pool, reused across dev hot reloads). Generator is `prisma-client-js` for compatibility with `@next-auth/prisma-adapter`. Schema holds the NextAuth models plus the domain models (`Applicant`, `Application`, `Event`, `History`). Prisma CLI config is in `prisma.config.ts`. The seed (`prisma/seed.ts`, `npm run db:seed` / `db:seed:reset`) loads **local-only sample data** from `prisma/seed-data/local.json` (gitignored) or `sample.json`; it refuses to run unless `DATABASE_URL` is localhost and `NODE_ENV` is not production. Production data will come from a future in-app Google Sheet import, never from the seed. See `docs/data-and-db.md`.
- **Auth**: `src/lib/auth.ts` (`authOptions`, Prisma adapter, database sessions) served at `src/app/api/auth/[...nextauth]/route.ts`; sign-in page is `src/app/login/`. **Google is the only provider.** Access = any member of the Skool Google Workspace: the OAuth client's consent screen is **Internal** (Google blocks outsiders), and the `signIn` callback double-checks server-side via the pure `evaluateSignIn` in `src/lib/access-policy.ts` (verified email + `hd` claim + email domain == `AUTH_ALLOWED_DOMAIN`). There is **no per-user allowlist**; don't add one. Denials return `/login?error=AccessDenied&account=…` before any DB write. Stay on NextAuth v4 (not the v5 beta).
- **Protecting things**: use `src/lib/session.ts`. Pages go under `src/app/(admin)/`, whose layout calls `requireAdmin(returnTo)` (redirects to `/login?callbackUrl=…`). **Layouts do not protect Route Handlers or Server Actions**: each one must call `getAdminSession()` itself and reject on `null`. `/login`, `/api/auth/*` and `/api/health` stay public, outside `(admin)`. Auth events log only `{ event, userId }` / `{ event, reason }`, never emails or tokens.
- **Logging**: `src/lib/logger.ts` (Pino; JSON in prod, pino-pretty in dev, with redaction). Don't log sessions, credentials, user records, or request bodies.
- **Health**: `GET /api/health` is a readiness check (`SELECT 1`), returns 200/503, `no-store`, never leaks error details.
- **UI**: Server Components by default; Client Components only at interactive boundaries. shadcn/ui primitives live in `src/components/ui` (add with `npx shadcn@latest add <component>`), theme tokens in `src/app/globals.css`. Shared pieces: `DataTable` (TanStack, client-side sorting/pagination for bounded data), `ChartContainer` (Recharts wrapper with accessible labelling), `useZodForm` (React Hook Form + Zod resolver), `formatValidationErrors` in `src/lib/validation.ts` for server-side validation errors — always validate on the server too.
- `pino`, `pino-pretty`, and Prisma packages are in `serverExternalPackages` in `next.config.ts`.

## Testing

Vitest + Testing Library, jsdom by default; tests are colocated as `src/**/*.test.{ts,tsx}` (only that glob is picked up). `server-only` is aliased to a no-op stub (`tests/server-only.ts`) so server modules are importable. Server/route tests opt into node with `// @vitest-environment node` and mock external boundaries (`@/lib/db`, `@/lib/logger`) via `vi.hoisted` + `vi.mock` — see `src/app/api/health/route.test.ts`. No test hits a real database.

## Specs and skills

- `openspec/` holds OpenSpec spec-driven change workflow (`openspec/changes`, `openspec/specs`); the `openspec-*` skills drive proposing, applying, and archiving changes.
- `.claude/skills/` (mirrored in `.agents/skills/`) contains Next.js skills (dev loop, bundle optimizer, Cache Components / Partial Prefetching adoption). Installed skills are tracked in `skills-lock.json`.
