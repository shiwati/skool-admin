# Tasks

This change specifies a screen that was built before the change existed. Tasks marked `[x]` were done and verified before this list was written. Open tasks are gaps found while writing the spec: behaviour the spec states but no test checks yet, plus the remaining manual checks.

## 1. Shared query and API parameters

- [x] 1.1 Move the `GET /api/events` query into `src/lib/events/list.ts` (`eventsQuerySchema`, `listEvents`) and make the route call it. Verified: the existing route tests pass without changes.
- [x] 1.2 Add `phase` (`active` | `planned` | `closed`, via `phaseWhere`) and `place` (location OR partner, case-insensitive) to the query. Verified: route tests "filters by place (location or partner) and phase" and "rejects an unknown phase" (400, no DB call).
- [x] 1.3 Add `countEventsByPhase`. It runs one count per phase with the other filters applied, and "all" is their sum. Verified: `npm run typecheck`, and the page renders the counts (see 4.1).
- [x] 1.4 Document `phase` and `place` in `docs/api.md`. Verified by reading the doc against the "Phase parameter" and "Place parameter" requirements.

## 2. Phase, status and formatting rules

- [x] 2.1 Add `src/lib/events/phase.ts`: `EVENT_PHASES`, labels, `eventStatus` and the badge tones. It must be client-safe. Verified: `phase.test.ts` covers closed, running, planned, full, open and capacity 0.
- [x] 2.2 Add `src/lib/events/format.ts`: the date range, day count, demand ratio, ratio formatting and ratio tone. Verified: `format.test.ts` covers the current year, one-day events, other years, a range across a year boundary, Budapest day boundaries and the three ratio bands.

## 3. URL state

- [x] 3.1 Add `src/lib/events/list-params.ts`: lenient parsing, serialisation without defaults, page reset on any change except the page, and mapping from tab to phase. Verified: `list-params.test.ts` covers defaults, round-trips, invalid values and the page reset.

## 4. Programs page and components

- [x] 4.1 Add `src/app/(admin)/events/page.tsx`. It is a Server Component that parses the URL state, calls `listEvents` and `countEventsByPhase` with one shared `now`, and renders `EventsView`. Verified: `npm run typecheck`; unauthenticated `GET /events` returns 307 to `/login?callbackUrl=%2Fevents`.
- [x] 4.2 Add `EventsView`, `EventsTabs`, `EventsToolbar` and `EventsTable` under `src/components/events/`. Verified: `events-view.test.tsx` covers the header, the default "Aktív" tab, a full row (name link, dates, "62 / 20 fő", "3,1×", status, "+1"), switching tab with a page reset, sorting by "Program", and the filtered empty state with "Szűrők törlése".
- [x] 4.3 Make `Pager` (`itemLabel`) and `SearchField` (`label`, `placeholder`) configurable without changing the applicants screen. Verified: the applicants tests still pass.
- [x] 4.4 Add view tests for the cells that are not covered yet: a missing location shows "—", no instructor and no mentors shows "—", capacity 0 shows "N jelentkező" with no ratio badge, and the partner company appears under the location. Verify that the new tests pass.
- [x] 4.5 Add a view test for the empty state without filters ("Ebben a szakaszban nincs program", and no "Szűrők törlése"). Verify that the test passes.
- [x] 4.6 Add a view test that the pager shows the tab-specific label, for example "1–1 / 1 aktív program", and "program" on "Összes". Verify that the test passes.
- [x] 4.7 Add toolbar tests: the "Időszak" chip sets `year` and "Bármikor" clears it, "Helyszín / partner" sets `place`, and "Szűrők törlése" keeps the selected tab. Verify that the new tests pass.

## 5. Admin shell

- [x] 5.1 Link the "Programok" sidebar item to `/events`. This was done in an earlier commit (`nav-items.ts`). Verified: the sidebar lists "Programok" as a link.
- [x] 5.2 Extend `admin-sidebar.test.tsx` "links the available screens" so it asserts that "Programok" has `href="/events"`, matching the modified "Sidebar menu items" requirement. Verify that the test passes.

## 6. Seed data

- [x] 6.1 Add sample events for every phase and status to `prisma/seed-data/sample.json`: open, full, oversubscribed, running, planned, no instructor, and closed in a previous year. Add matching applications. Verified: `seed-data-schema.test.ts` passes, and `npm run db:seed` loaded 10 events and 26 applications.

## 7. Integration check

- [x] 7.1 Run `npm run lint`, `npm run typecheck` and `npm test`. Verified: all pass (312 tests at the time of writing).
- [x] 7.2 Run `npm run format:check`. It currently fails on files this change does not touch, because their CRLF line endings come from the working copy. The files this change touches pass `prettier --check`. Verify either a clean run or a confirmation that the remaining warnings are pre-existing.
- [x] 7.3 Signed in, with the seeded local DB and `npm run dev` running, open `/events`. Check every tab and its count, the filters, sorting, paging, reloading the URL, and the links to `/applicants?eventIds=…`. Verify that the screen matches board "05.1 Programok listája" except for the out-of-scope parts listed in proposal.md.

## Workflow follow-up

- Have the product owner or designer review the derived rules in the spec, "Event phase" and "Event display status": "Tervezett" means no sheet, and every application status counts toward demand. If they disagree, update the spec before archiving.
- Archive the change after review. This creates `openspec/specs/event-list/spec.md` and updates `admin-shell`.
