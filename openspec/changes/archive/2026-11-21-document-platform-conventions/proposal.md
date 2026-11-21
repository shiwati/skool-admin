## Why

Several platform-wide behaviours (API protection and error shapes, the health check, the local seed guard, and the post-login return path) already exist in code and in `docs/`, but have no OpenSpec contract. Backfilling them lets future changes reference and protect these conventions instead of rediscovering them.

## What Changes

- Document the shared conventions of every `/api/*` route handler: session check with `401`, `no-store`, JSON error shapes, server-side Zod validation, opaque `500`s and privacy-safe logging.
- Document the public readiness check `GET /api/health`.
- Document the local-only seed: environment guard, data file selection and validation, reset mode and demo data.
- Refine the `admin-auth` "Admin pages require a session" requirement with the observed return-to-page mechanics and the open-redirect protection of the return URL.
- No code or behaviour changes (documentation of current behaviour only).

## Capabilities

### New Capabilities

- `api-conventions`: protection, caching, validation, error responses and logging rules shared by all admin API route handlers.
- `health-check`: the public database readiness endpoint.
- `local-seed-data`: loading sample/demo data into a local development database, and refusing anywhere else.

### Modified Capabilities

- `admin-auth`: "Admin pages require a session" gains explicit scenarios for preserving the query string, ignoring protocol-relative / backslash / foreign-origin return URLs, and API routes answering `401` instead of redirecting.

## Impact

- Specs only: `openspec/specs/api-conventions`, `health-check`, `local-seed-data` (new) and `admin-auth` (modified).
- Code referenced (unchanged): `src/lib/api/handler.ts`, `src/lib/session.ts`, `src/lib/logger.ts`, `src/app/api/**/route.ts`, `src/app/api/health/route.ts`, `prisma/seed.ts`, `src/lib/seed-guard.ts`, `src/lib/seed-data-schema.ts`, `src/lib/seed-demo-data.ts`, `src/proxy.ts`, `src/lib/callback-url.ts`, `src/lib/return-to.ts`.
- Known deviation found while documenting (not specified, tracked in tasks): the shared GET error handler logs the full request URL, whose query string may contain a searched name or e-mail.
