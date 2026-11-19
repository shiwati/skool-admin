# Tasks

## 1. Data layer

- [x] 1.1 Export `emptyCounts` from `src/lib/events/list.ts`; add `src/lib/events/overview.ts` (`getEventOverview`, request-memoised): event, counts per status, latest 5 `History` rows.
- [x] 1.2 Add `src/lib/events/history-labels.ts` (field labels and value formatting) with a test.
- [x] 1.3 Move the tag and avatar colours (`colors.ts`) and the route helpers (`links.ts`) out of the client-only `events-table.tsx`, so server components can use them.

## 2. Page

- [x] 2.1 `src/app/(admin)/events/[id]/(overview)/layout.tsx` and `page.tsx` (both call `requireAdmin`), `[id]/not-found.tsx`. The `(overview)` route group keeps the header off `/events/[id]/edit`.
- [x] 2.2 Components in `src/components/events/overview/`: header, actions (edit, delete), tabs, KPI card, status breakdown, details, people, sheet source (client), history.

## 3. Verify

- [x] 3.1 Tests for the data layer, components and page.
- [x] 3.2 `npm run lint`, `npm run typecheck` and `npm test` pass. `npm run format:check` reports files across the repo (line endings of the Windows checkout); the new files are formatted with Prettier.
- [ ] 3.3 Check the page signed in, in the browser (seeded program, new program without applications, edit then see the change). Signed out, the routes were checked to redirect to `/login` with the right `callbackUrl`.

## Workflow follow-up

- Archive this change after review.
