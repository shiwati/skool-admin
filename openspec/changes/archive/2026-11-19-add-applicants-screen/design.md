# Design

## Context

- **API.** `GET /api/applicants` (`src/app/api/applicants/route.ts`) already exists. It checks the session through `handleQuery` and supports `q`, `eventIds`, `ageFrom`/`ageTo`, `hometown`, `newsletter`, `attended`, sorting by `lastName | birthYear | hometown | createdAt`, and paging with `pageSize ≤ 100`. It returns `{ items, total, page, pageSize }`, and each item includes `applications` (status, receivedAt, event id/name/from) newest first. `GET /api/events` exists and is used for the Program filter options.
- **Database.** `prisma/schema.prisma` already defines `Applicant`, `Application` (with `ApplicationStatus`), `Event` and `History`. The only migration is `20261028212000_auth_infrastructure`, so the domain tables don't exist in any database yet.
- **UI foundation.** The `(admin)` layout only guards the session and has no chrome. The only shadcn primitive is `button`. The brand tokens from design board DS.1 are already in `src/app/globals.css` (sky, lavender, peach, lemon, sage, pink, ink, neutrals, error). `DataTable` sorts and pages on the client, which doesn't fit a server-paged list.
- **Design source.** The UI design artifact, boards 03.1, 03.2, 09.1, Sidebar and Topbar. See `proposal.md` for what is in and out of scope.

## Goals / Non-Goals

**Goals:**

- A shell and list that later screens (Programs, Data sheet) can reuse without restructuring.
- Anonymization logic kept separate from the HTTP route, so the future data-sheet delete (board 04.3) can call it.
- No new query parameters on `GET /api/applicants`.

**Non-Goals:**

- Topbar global search, ⌘K and notifications (shown on the Topbar board, but nothing backs them). They are left out, not stubbed.
- Sidebar counters (duplicate badge "3", Programok "24", Visszajelzések "312") and the "Google Sheet szinkron" card.
- Writing `History` entries for ordinary edits. Only the anonymization entry is written here.
- Excluding anonymized applicants from `/api/events/[id]/applicants`. That is the program screen's concern. Their applications deliberately keep counting there.

## Decisions

### 1. The list is a Client Component fed by `/api/applicants`; the page and shell are Server Components

`src/app/(admin)/applicants/page.tsx` is a Server Component that renders the heading, the static banner and a client `<ApplicantsView>` inside `<Suspense>`. `<ApplicantsView>` reads its state from `useSearchParams`, builds the query string, and fetches `/api/applicants` with an `AbortController` so that stale responses are dropped. Changes are written back with `router.replace(…, { scroll: false })`.

_Alternatives considered:_

- **Querying Prisma in the Server Component.** Rejected, because the request explicitly asks for the data to come from the endpoint, and it would duplicate the endpoint's filter logic.
- **TanStack Query or SWR.** Rejected: it adds a dependency to fetch from one endpoint. A small `useApplicants(params)` hook with abort and a `reload()` covers loading, error and retry.

### 2. URL ↔ state mapping lives in one pure module

`src/lib/applicants/list-params.ts` parses `URLSearchParams` into a typed `ListState` with zod, falling back to defaults for invalid values. It also serializes `ListState` back to the URL and to the API query. UI sort keys map to API keys:

| UI column          | API `sort`  | Direction                                  |
| ------------------ | ----------- | ------------------------------------------ |
| Név / e-mail       | `lastName`  | same                                       |
| Életkor            | `birthYear` | **inverted** (younger = larger birth year) |
| Település / iskola | `hometown`  | same                                       |
| Jelentkezett       | `createdAt` | same; default `desc`                       |

The default page size is 25, with options 10/25/50/100 (the API maximum is 100). Any change except page navigation resets `page` to 1. The module is pure and unit-tested; it is the main guard against URL and API drift.

### 3. A dedicated server-driven table, not `DataTable`

_Implemented differently from the original plan:_ the plan was TanStack Table v9 in manual mode. Sorting and paging are server-side, though, and column order, visibility and selection are plain state, so the table library would only have rendered rows. A typed column config (`columns.tsx`) and a plain `<table>` are less code, and this avoids depending on the new v9 API for one screen. `DataTable` stays as it is for bounded client-side data. Column definitions are a static list of ids: `select`, `name` (always visible), `age`, `program`, `status`, `location`, `newsletter`, `history`, `createdAt`, `parent` (hidden), `phone` (hidden), `actions`. `select` and `actions` are pinned and can't be configured. Derived cell values (age, newest application, "+N", the attended count, initials, Budapest-time `YYYY.MM.DD`) come from pure helpers in `src/lib/applicants/format.ts`.

_Alternative considered:_ extending `DataTable` with a manual mode. Rejected: it would grow into a configurable mega-component for one consumer.

### 4. Column settings are stored in `localStorage`, versioned and validated

The key is `skool-admin:applicants:columns:v1` and the value is `{ order: string[], hidden: string[] }`. It is validated with zod: unknown ids are dropped, missing configurable ids are added at their default position, and `name` is never hidden. Reads and writes are wrapped in try/catch. _Implemented with_ `useSyncExternalStore` over `localStorage` (server snapshot = defaults). This gives a correct hydration without a set-state-in-effect, and also follows changes made in other tabs. If storage is blocked, settings are kept in memory for the visit. Reordering uses native HTML5 drag and drop plus "Feljebb"/"Lejjebb" icon buttons for keyboard and screen reader users, so no drag-and-drop dependency is needed.

### 5. The e-mail list is built on the client by paging the existing endpoint

"E-mail lista" requests `/api/applicants` with the current filters and `pageSize=100`, page after page, until `total` is reached. It collects `email`, removes duplicates case-insensitively while keeping the first spelling, and joins the result with `", "`. The dialog shows progress while loading and can be cancelled (abort). "E-mail címek másolása" for selected rows uses the rows already loaded, with no extra request.

_Alternative considered:_ a dedicated `GET /api/applicants/emails`. It would take one request instead of ⌈N/100⌉, but it is a new read endpoint that duplicates the filter logic. Given the expected volume (about 1–2k applicants, around 20 requests at most), paging is acceptable. See Risks.

### 6. Deletion goes through a Route Handler that calls a domain service in one transaction

- **Endpoint.** `POST /api/applicants/delete` takes `{ ids: string[] }` (1–100, unique, non-empty strings). It follows the existing API style (JSON, `no-store`, `{ error }` bodies), and calls `getAdminSession()` itself, because layouts don't protect handlers. A Route Handler was chosen over a Server Action to match the existing `/api` surface and its tests.
- **Service.** `anonymizeApplicants(db, ids, actorUserId)` in `src/lib/applicants/anonymize.ts` does the following inside `db.$transaction`:
    1. Load `{ id, deletedAt }` for `ids`. If any is missing, throw `NotFound`; the route answers 404 and nothing is written.
    2. Keep only the targets with `deletedAt === null`. Already-deleted ones are no-ops.
    3. `applicant.updateMany`: names become "Törölt" / "jelentkező"; email, phone, school and the six parent fields become null; `newsletter = false`; set `deletedAt = now`, `deletedById = actor` and `updatedById = actor`.
    4. Load those applicants' application ids, then `application.updateMany`: the eight free-text fields become null and `updatedById = actor` is set.
    5. `history.updateMany` sets `oldValue = null, newValue = null` where (`tableName = 'applicant'` and `recordId ∈ targets`) or (`tableName = 'application'` and `recordId ∈ applicationIds`).
    6. `history.createMany` adds one row per target: `{ tableName: 'applicant', fieldName: 'deletedAt', recordId, createdById: actor, oldValue: null, newValue: null }`.

    It returns `{ deleted: number }`. `tableName` uses the database table names (`@@map`) as the convention for `History`.

- **Logging.** The route logs `{ event: "applicants.anonymized", userId, count }`, with no ids or personal data.
- **List filter.** `GET /api/applicants` gets `deletedAt: null` as a fixed element of its `AND` array.

_Alternative considered:_ hard delete plus a separate statistics table. Rejected, because the user chose soft delete with anonymization, so applications stay linked to their program.

### 7. Schema change: soft-delete columns, plus the missing domain migration

`Applicant` gets `deletedAt DateTime? @map("deleted_at")` and `deletedById String? @map("deleted_by")`, with relation `"ApplicantDeletedBy"` to `User` (`onDelete: SetNull`) and the back-relation on `User`. There is also an `@@index([deletedAt])`. _As implemented:_ a teammate had meanwhile pushed `20261119171300_domain_models`, so the new migration `20261119172536_applicants_soft_delete` only adds the two columns, the index and the foreign key.

### 8. The shell: server layout, small client islands

- **Layout.** `(admin)/layout.tsx` keeps `requireAdmin`, then renders a grid: a 248px `<AdminSidebar>` and a column holding `<AdminTopbar session>` and `<main>`.
- **Sidebar** (client, for `usePathname`). Nav items are defined as data `{ label, href?, icon }`. Items without `href` render as `<span aria-disabled="true">` with tertiary styling instead of a link. The active item gets `aria-current="page"` and the ink pill style.
- **Topbar** (server). It renders the user from the session. The user menu (shadcn `dropdown-menu`) is a client island with "Kijelentkezés", reusing the existing `signOut({ callbackUrl: "/login" })` logic. `SignOutButton` is removed from `(admin)/page.tsx`.
- **Return URL (added during implementation).** Layouts can't read the URL, so `requireAdmin("/")` always sent `callbackUrl=/`, and the layout's redirect wins over the page's. That broke "redirected to `/login` with `/applicants` as the return URL". `src/proxy.ts` now forwards the requested path and query in an `x-skool-return-to` request header. The layout sanitizes it with `safeCallbackPath` and passes it to `requireAdmin`. The proxy makes no access decision.
- **Acting user id (added during implementation).** A `session` callback in `src/lib/auth.ts` exposes the internal `User.id` as `session.user.id`, which deletion needs for `deletedById` and the log.

### 9. New UI primitives

These are added via `npx shadcn@latest add`: `input`, `checkbox`, `badge`, `dialog`, `alert-dialog`, `popover`, `dropdown-menu`, `tooltip`, `skeleton`, `sonner` (toasts for the "copied" and "deleted" confirmations). This brings in Radix packages and `sonner`. They are pinned exactly, and `allowScripts` is checked with `npm install-scripts`. Status badge colours map to DS.1 tokens: applied → sky, accepted → lavender, waitlisted → peach, attended → lemon, rejected → neutral. The Program dot uses a colour derived deterministically from the event id, taken from the brand palette.

## Risks / Trade-offs

- **[Paging the e-mail list costs ⌈N/100⌉ requests]** → Requests run sequentially with abort and a progress indicator. If volumes grow, add a dedicated endpoint without changing the spec.
- **[Anonymization is irreversible; a mis-selection loses data]** → An acknowledgement checkbox is required, the dialog shows the name or count, and the selection is cleared whenever the result set changes, so the user can't delete rows they no longer see.
- **[Scrubbing `History` relies on `tableName`/`recordId` conventions nobody writes yet]** → The convention (table names from `@@map`) is documented in `anonymize.ts`, and tests cover both applicant and application entries. Future history writers must use the same values.
- **[Column settings live per browser]** → Accepted, as decided; a user sees their defaults on another device.
- **[Domain migration may collide with a teammate's migration]** → Check `origin/develop` before generating it (see Migration Plan).
- **[The API's age filter is year-based (≈ age)]** → Accepted. The UI shows the same "current year − birth year" age, so the two stay consistent.

## Migration Plan

1. Pull `develop` and confirm that no domain migration exists yet. Then update the schema and run `npm run db:migrate -- --name applicants_domain_and_soft_delete`. Commit the migration.
2. Every environment runs `npm run db:deploy`. The migration is additive only (new tables and nullable columns), so no backfill is needed.
3. Rollback: revert the app commit. The new columns and tables can stay, since nothing else reads them. Anonymized data can't be restored by design.
