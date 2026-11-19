# Tasks

## 1. Database: domain migration and soft-delete columns

- [x] 1.1 Pull `develop` and check `prisma/migrations/` for a domain-tables migration from a teammate. Record what you find in the PR description. Verify: `git log origin/develop -- prisma/migrations` has been inspected.
- [x] 1.2 Add `deletedAt`/`deletedById` (relation `ApplicantDeletedBy`, `onDelete: SetNull`, back-relation on `User`) and `@@index([deletedAt])` to `Applicant` in `prisma/schema.prisma`. Verify: `npx prisma format` and `npx prisma validate` succeed.
- [x] 1.3 Generate and commit the migration with `npm run db:migrate -- --name applicants_domain_and_soft_delete`. It covers all domain tables plus the new columns, or only the columns if 1.1 found an existing domain migration. Verify: `npx prisma migrate status` reports up to date and `\dt` in the local DB lists `applicant`, `application`, `event`, `history`.
- [x] 1.4 Update `CLAUDE.md` (Database section: the schema now contains domain models, and applicants are soft-deleted via `deletedAt`). Verify: `npm run format:check` passes.

## 2. UI primitives

- [x] 2.1 Add the shadcn components `input checkbox badge dialog alert-dialog popover dropdown-menu tooltip skeleton sonner`. Pin the new dependencies exactly and run `npm install-scripts` to review `allowScripts`. Mount `<Toaster>` in the root layout. Verify: `npm run typecheck` and `npm run lint` pass, and `package.json` has no `^`/`~` ranges.

## 3. Admin shell

- [x] 3.1 Implement `AdminSidebar` (nav items as data; active item via `usePathname` with `aria-current="page"`; items without `href` rendered with `aria-disabled`; logo from `public/brand`; "admin" badge; "Főmenü"/"Adatok" groups) following the Sidebar board. Verify: component tests cover the order, the active item on `/applicants` and nested paths, and the disabled "Programok" not being a link.
- [x] 3.2 Implement `AdminTopbar` with name, e-mail and avatar (picture or initials) and a user dropdown with "Kijelentkezés" calling `signOut({ callbackUrl: "/login" })`. Verify: tests cover the initials fallback ("Kovács Anna" → "KA") and that sign-out calls `signOut` with `/login`.
- [x] 3.3 Wire the shell into `src/app/(admin)/layout.tsx` (keep `requireAdmin`) and remove `SignOutButton` from `(admin)/page.tsx`, deleting the file if unused. Verify: `npm test` passes, and in `npm run dev`, `/` shows the sidebar and topbar while `/login` shows neither.

## 4. API: exclude deleted applicants

- [x] 4.1 Add a fixed `deletedAt: null` condition to the `where` in `GET /api/applicants`, used for both `findMany` and `count`. Verify: a new case in `src/app/api/applicants/route.test.ts` asserts that the condition is present.

## 5. Anonymization service and endpoint

- [x] 5.1 Implement `anonymizeApplicants(db, ids, actorUserId)` in `src/lib/applicants/anonymize.ts` per design §6 (one transaction; NotFound on unknown ids; skip already deleted; clear applicant PII, application free-text and History values; add the `deletedAt` History entry). Document the `History` `tableName` convention in the module. Verify: unit tests with a mocked `db` cover the field lists, the skip-already-deleted case, the NotFound case with no writes, and History scrubbing for both `applicant` and `application` records.
- [x] 5.2 Add `POST /api/applicants/delete` (`getAdminSession()` → 401; zod body of 1–100 unique non-empty ids → 400 with `formatValidationErrors`; NotFound → 404; other errors → 500 with no details; success → `{ deleted }`, `no-store`; log `{ event: "applicants.anonymized", userId, count }`). Verify: `route.test.ts` (node env, mocked `@/lib/session`, `@/lib/db`, `@/lib/logger`) covers 401, 400 (empty, 101 ids, malformed JSON), 404, 500 and success, including that the log payload has no ids or personal data.

## 6. List state, formatting helpers and data hook

- [x] 6.1 Implement `src/lib/applicants/list-params.ts`: parse URL → `ListState` with defaults (sort `createdAt desc`, page 1, pageSize 25 ∈ {10,25,50,100}); serialize to URL and to the API query; UI→API sort mapping with inverted age; reset page on non-page changes; reject `ageFrom > ageTo`. Verify: unit tests cover round-trips, invalid params falling back to defaults, the age-sort inversion, and the page reset.
- [x] 6.2 Implement `src/lib/applicants/format.ts`: age from birth year, "16+" flag, newest application plus "+N", attended count, initials, Budapest-time `YYYY.MM.DD`, Hungarian thousands grouping ("1 248"), status → label/badge variant, deterministic program colour, and e-mail list building (dedupe case-insensitively, skip null, join with `", "`). Verify: unit tests for each helper, including the spec scenarios (Nagy Luca row, copying with a missing address).
- [x] 6.3 Implement the `useApplicants(state)` hook (fetch `/api/applicants`, abort stale requests, `loading | error | data`, `reload()`, on 401 → `window.location` to `/login?callbackUrl=<current URL>`). Verify: hook tests with mocked `fetch` cover success, 500 → error plus reload, a stale response being ignored, and the 401 redirect.

## 7. Applicants page and table

- [x] 7.1 Create `src/app/(admin)/applicants/page.tsx` (metadata title "Jelentkezők"; header with overline, heading, subtitle with the total; disabled "Szinkronizálás" with tooltip; "E-mail lista" button; static duplicate banner with disabled "Ellenőrzés"; `<Suspense>` around the client view). Verify: page test renders the heading, the disabled sync button with its explanation, and the banner without a count.
- [x] 7.2 Build `ApplicantsTable` (TanStack manual sorting and pagination; columns per design §3; cells via `format.ts`; sortable headers with `aria-sort`; skeleton rows with `aria-busy`; empty state with "Szűrők törlése"; error state with "Újratöltés"; footer with range, "Sorok / oldal" and pager). Verify: component tests cover column order, the row content scenarios, sort toggling (calling back with the mapped state), empty, loading and error states, and pager behaviour.
- [x] 7.3 Build the toolbar: debounced search (`q`) and the filter chips Program (options from `GET /api/events?pageSize=100`), Életkor (min/max with validation message), Település, Hírlevél, Részt vett, each showing its value and removable, plus "Szűrők törlése". Verify: tests cover that each chip writes the right URL params, the invalid age range not being applied, and the debounce.
- [x] 7.4 Wire `ApplicantsView` (URL ↔ state via `list-params`, `router.replace` without scroll, `useApplicants`, table and toolbar). Verify: integration test with mocked `fetch` and router; changing a filter updates the URL, resets to page 1, and requests the matching API query.

## 8. Column picker

- [x] 8.1 Implement column settings storage (`skool-admin:applicants:columns:v1`, zod-validated, try/catch, merged with defaults, `name` never hidden, applied after mount). Verify: unit tests cover corrupt JSON, unknown ids, missing ids, and an unavailable storage that throws.
- [x] 8.2 Build the "Oszlopok a listában" popover (checkbox per column, drag reorder, "Feljebb"/"Lejjebb" buttons, "Alapértelmezés visszaállítása"; "Szülő neve és e-mail" and "Telefonszám" hidden by default). Verify: tests cover showing "Telefonszám", moving "Hírlevél" up with the keyboard changing table order, reset, and settings surviving a remount.

## 9. Selection, e-mail copy and e-mail list

- [x] 9.1 Add row selection (row checkboxes, header "Összes kijelölése" with indeterminate state, highlighted rows, cleared on page/sort/search/filter change) and the "Tömeges műveletek" floating toolbar ("N kijelölve", "E-mail címek másolása", "Törlés", "Kijelölés megszüntetése"). Verify: tests cover select-all on the page, the indeterminate header, clearing on filter change, and the toolbar visibility.
- [x] 9.2 Implement "E-mail címek másolása" (clipboard, toast with the count). Verify: test with a mocked `navigator.clipboard` asserts the text `a@x.hu, b@y.hu` and the toast "2" for the missing-address scenario.
- [x] 9.3 Implement the "E-mail lista" dialog (pages through `/api/applicants` with the current filters and `pageSize=100` until `total`; progress; cancel aborts; read-only textarea; count "N e-mail cím"; "Másolás"; empty message with copy disabled). Verify: tests with mocked `fetch` across 2+ pages assert all addresses with duplicates removed, cancellation, and the empty case.

## 10. Deletion UI

- [x] 10.1 Add the row "Műveletek" dropdown with "Törlés", and wire the bulk "Törlés" to one confirmation `alert-dialog` (name or count, irreversibility text, "Értem, a törlés nem vonható vissza" checkbox gating the destructive button, "Mégse"). On confirm, POST `/api/applicants/delete`; on success show a toast with the count, clear the selection and reload; on failure show a retryable error. Verify: tests cover the gated button, cancel making no request, the success flow (request body, toast, reload), and the error message.

## 11. Integration checks

- [x] 11.1 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check` and `npm run build`. Verify: all pass with zero warnings.
- [ ] 11.2 Manual check with `npm run dev` against seeded local data (a few applicants, events and applications inserted via pgAdmin or a scratch script, not committed): filters, sort and paging reflected in the URL and restored on reload; column settings persist; e-mail list across pages; deleting an applicant removes them from the list, the DB row shows the placeholders, null PII and `deletedAt`, applications are kept with free text cleared, and the `history` entry exists. Verify: record the checked items in the PR description.

## Workflow follow-up

- Archive the change after review with `openspec-archive-change add-applicants-screen`. This syncs the `admin-shell`, `applicant-list` and `applicant-anonymization` specs.
