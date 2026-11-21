## 1. Verify api-conventions coverage

- [x] 1.1 Confirm every route under `src/app/api/` except `health` and `auth/[...nextauth]` has a `route.test.ts` case asserting `401 {"error":"Unauthorized"}` without a session; verify with `npx vitest run src/app/api`
- [x] 1.2 Confirm the route tests for `src/app/api/sheets/headers/route.ts` (added by `document-sheet-import` 2.1) and `PUT src/app/api/events/[id]/report/route.ts` (added by `document-event-management` 2.1) assert 401, 400 validation and 500 without details; verify with `npx vitest run src/app/api/sheets src/app/api/events`
- [x] 1.3 Add a `Cache-Control: no-store` assertion to at least one success and one error response of a `handleQuery`-based route (e.g. `src/app/api/applicants/route.test.ts`) and a write route without one (e.g. `events/[id]/route.test.ts`); verify the tests pass
- [x] 1.4 Add a `src/lib/api/handler.test.ts` covering 401, 400 `Invalid query parameters` with `details`, and opaque 500; verify with `npx vitest run src/lib/api`
- [x] 1.5 Confirm success-log tests (e.g. delete, edit, status routes) assert the logged object holds only event/userId/ids/counts; verify by reading the tests and running them

## 2. Verify health-check coverage

- [x] 2.1 Confirm `src/app/api/health/route.test.ts` covers 200, 503, `no-store` and the absence of error details in the body; verify with `npx vitest run src/app/api/health`

## 3. Verify local-seed-data coverage

- [x] 3.1 Confirm `src/lib/seed-guard.test.ts` covers production refusal, remote host, invalid URL and each local host (`localhost`, `127.0.0.1`, `::1`); verify with `npx vitest run src/lib/seed-guard.test.ts`
- [x] 3.2 Confirm `src/lib/seed-data-schema.test.ts` covers an unknown cross-reference and `src/lib/seed-demo-data.test.ts` covers determinism and `demo_` id prefixes; verify with `npx vitest run src/lib/seed-`

## 4. Verify admin-auth return URL coverage

- [x] 4.1 Confirm `src/lib/callback-url.test.ts` and `src/lib/return-to.test.ts` cover foreign origin, `//host`, `/\host`, non-http scheme, same-origin absolute URL and query preservation; add any missing case; verify with `npx vitest run src/lib/callback-url.test.ts src/lib/return-to.test.ts`

## 5. Cleanup (behaviour-neutral)

- [x] 5.1 Unify `handleQuery` to use `getAdminSession()` (docs/gaps-and-decisions.md item 3) and verify route tests pass (`npx vitest run src/app/api`, `npm run typecheck`)
- [x] 5.2 `handleQuery` must not log `request.url` (its `q` can hold a searched name or e-mail): log only the pathname and the event name; add a test in `src/lib/api/handler.test.ts` asserting the logged object contains no query string; `npx vitest run src/lib/api` passes
- [x] 5.3 Update `docs/gaps-and-decisions.md` item 3 as resolved; verify by reading the doc
