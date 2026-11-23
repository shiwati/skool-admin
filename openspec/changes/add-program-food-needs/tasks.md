# Tasks

## 1. Database and status plumbing

- [x] 1.1 Add `CANCELLED @map("cancelled") /// lemondta` to `ApplicationStatus` in `prisma/schema.prisma` and create the migration (`npm run db:migrate -- --name add_cancelled_status`), additive only. Verify: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` passes after `db:deploy`.
- [x] 1.2 Add `CANCELLED` to `APPLICATION_STATUSES` (`src/lib/applicants/types.ts`), `STATUS_LABELS` ("Lemondta") and `STATUS_BADGE_CLASSES` in `src/lib/applicants/format.ts` (Új jelentkező sky, Elfogadva mint, Várólista lemon, Részt vett lavender, Lemondta peach, Elutasítva unchanged; the funnel card's Elfogadva bar uses the same class) and the `--color-mint: #b5e3d8` token in `src/app/globals.css`. Verify: `src/lib/applicants/format.test.ts` covers the label and class.
- [x] 1.3 Include `CANCELLED` in the status lists of `status-breakdown.tsx`, `status-filter-chips.tsx`, `status-cell.tsx` (`STATUS_OPTIONS`) and `capacity-chart.tsx`, and in `funnel()` (`total` and a new `cancelled` count, shown in the funnel card's side list). Verify: updated tests of those components and `src/lib/dashboard/insights.test.ts`.
- [x] 1.4 Check the remaining enum-driven code (`events/list.ts` `StatusCounts`, the status API route, the applicant detail labels, the seed demo data, CSV export) works with the new value. Verify: `npm run typecheck` and the touched test files pass.

## 2. Food needs card

- [x] 2.1 Add the pure `foodNeeds(rows)` to `src/lib/events/food-needs.ts`: status filter and order, one entry per applicant (first status wins), anonymized applicants excluded, "no restriction" detection per design.md, rows sorted by answer then name, and the count of applicants without a need. Verify: `src/lib/events/food-needs.test.ts` covers each scenario, accents, case, punctuation, "nem eszik húst", empty answers and the sorting.
- [x] 2.2 Add `getFoodNeeds(eventId)` in `src/lib/events/food-needs-load.ts`. Verify: `food-needs-load.test.ts` asserts the status filter and the result.
- [x] 2.3 Create `src/components/events/overview/food-needs-card.tsx` (table "Név" / "Étkezési igény", a status row and a coloured bar per group, the total at the end) and render it under the people card on the program page. Verify: `food-needs-card.test.tsx` and the program page test.

## 3. Docs

- [x] 3.1 Update `docs/domain.md` (status table), `docs/frontend.md` (dashboard program view and the status UI) and `docs/gaps-and-decisions.md` (decision log: exact-list "no restriction" rule, cancelled counts as an application, mint colour). Verify: `npm run format:check` passes.

## 4. Verification

- [x] 4.1 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check` and `openspec validate --all --strict`.
- [x] 4.2 Add E2E coverage in `e2e/` (fixtures with a cancelled and a food-restricted applicant; a write test for changing a status to "Lemondta"), then run `npm run test:e2e` once.
