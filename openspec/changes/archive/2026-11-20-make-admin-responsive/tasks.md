# Tasks

## 1. Foundations

- [x] 1.1 Export `viewport` (`width: "device-width"`, `initialScale: 1`, `viewportFit: "cover"`) from `src/app/layout.tsx`. Document the breakpoint table in `docs/frontend.md`: mobile < 768, tablet `md:` 768–1279, desktop `xl:` ≥ 1280, minimum 360 px. Also document the CSS-visibility pattern. Verify: `npm run build` succeeds and the rendered `<meta name="viewport">` contains `viewport-fit=cover`.
- [x] 1.2 Make `PageShell` responsive (`px-4 md:px-6 xl:px-8`, top and bottom paddings per design §3). Let `PageHeader` actions go full width on mobile and take an optional `mobileActions` slot. Add a `mobileBack` mode to `Breadcrumb` (below `md`, only "‹ {parent}"). Verify: unit tests for `Breadcrumb` cover the back link (`md:hidden`) and the full trail (`hidden md:flex`); `PageHeader` renders `mobileActions` only in its `md:hidden` container.

## 2. Admin shell

- [x] 2.1 Extend `nav-items.ts` with `shortLabel`, the mobile placement (`tab` | `more`) and the rail's "Adatok" entry, keeping `isActive`. Verify: `nav-items` tests cover the tab items ("Áttekintés", "Jelentkezők", "Programok", "Visszajelzések"), the more items ("Riportok", "Adatforrások", "Adatmigráció", "Változásnapló") and the short label "Visszajelz.".
- [x] 2.2 Add `AdminRail`: 80 px, logo, "admin" badge, icon items with short labels and full accessible names, separator, disabled "Adatok", active state per `isActive`. Verify: tests cover the order, `aria-current` on `/applicants/abc`, and disabled items not being links.
- [x] 2.3 Add `MobileTopBar` (56 px, sky background, logo, "admin" badge, avatar-only `UserMenu` that shows the name and e-mail inside the menu), `MobileTabBar` (fixed bottom, 5 items ≥ 44 px, active state, disabled "Visszajelzések") and `MoreSheet` (Radix `Dialog` titled "Több" listing the more items, closing on navigation). Verify: tests cover the tab order and active item, opening "Több" listing four disabled items, and sign-out from the avatar menu calling `signOut`.
- [x] 2.4 Restructure `src/app/(admin)/layout.tsx` per design §2: grid per breakpoint, `--shell-left`/`--shell-bottom` variables, visibility classes, and `main` bottom padding. Verify: a layout test (mocked session) asserts the three navigations carry `xl:flex`/`xl:hidden`/`md:hidden` as designed and `main` has the bottom padding class; the existing shell tests still pass.

## 3. Floating elements

- [x] 3.1 Position the applicants `BulkActionBar` and the applicant edit save bar with `--shell-left`/`--shell-bottom` instead of fixed sidebar offsets. Hide the bulk bar below `md`. Verify: component tests assert the new position classes; no `248px` literal remains (`grep -rn "248px" src/components` shows only the sidebar width).

## 4. Login (01.1)

- [x] 4.1 Switch the login page to `flex-col xl:flex-row`, with brand band and card sizes per boards 01.1 T and 01.1 M: the 32 px title on mobile, module chips hidden on mobile, a full-width card with 16 px margins, a centred footer. Verify: `login` page tests still pass and assert the module list has `hidden md:flex`.

## 5. Dashboard (02.1)

- [x] 5.1 Apply the dashboard grids per design §6: KPI `grid-cols-2 md:grid-cols-3` with the satisfaction card `col-span-2 md:col-span-1`, charts single-column below `xl`, the lower row two columns from `lg`, and `DashboardActions` scrolling horizontally on mobile. Normalise `sm:` to `md:` in the dashboard files. Verify: `dashboard-cards.test.tsx` asserts the grid and span classes; manual check at 390 px shows two KPI cards per row with the satisfaction card full width.

## 6. Applicants list (03.1)

- [x] 6.1 Extract the loading, empty and error rendering of `ApplicantsTable` into a shared `ListState`, and wrap the table in `hidden md:block` with its horizontal scroll frame. Verify: existing table tests pass, scoped to `within(screen.getByRole("table"))` where needed.
- [x] 6.2 Add `ApplicantCardList` (`md:hidden`, `<ul aria-label="Jelentkezők">`). Each card is a link to `/applicants/{id}` with the avatar, name with "16+", e-mail, "{age} év · {település}", the "Korábban részt vett · N program" or "Első jelentkezés" badge and the "Hírlevél" badge, and no checkbox. Wire it into `ApplicantsView` with the shared pager and `ListState`. Verify: tests cover the Nagy Luca card scenario, the card href, missing age or settlement, and the empty and error states inside the list.
- [x] 6.3 Make `ApplicantsToolbar` responsive:
    - mobile: search plus a "Szűrők" button (badge with the active count, accessible name "Szűrők (N aktív)", 44 px) opening a `Dialog` with the existing filter chips stacked, plus "Szűrők törlése"
    - tablet and desktop: inline wrapping chips
    - column picker hidden below `md`

    Verify: tests cover opening the dialog, turning on "Hírlevél" updating the URL state, the count in the accessible name, and the column picker container carrying `hidden md:block`.

- [x] 6.4 Make `ApplicantsHeader` and `DuplicateBanner` responsive. On mobile, "E-mail lista" and the disabled "Szinkronizálás" move into a "További műveletek" menu, and the banner is compact. Verify: tests cover the "E-mail lista" menu item opening the dialog and "Szinkronizálás" being disabled in the menu.

## 7. Applicant detail (04.1)

- [x] 7.1 Make the detail header and layout responsive:
    - Check the single-column card order below `xl`; move "Címkék" and "Változástörténet" after the main cards.
    - Mobile header: centred, 64 px avatar, full-width action row.
    - Tablet action row: shared width.
    - Use the `mobileBack` breadcrumb.

    Verify: the page test asserts the DOM order of the card headings and the presence of the "‹ Jelentkezők" back link (`md:hidden`) pointing to `/applicants`.

- [x] 7.2 Switch `KeyValueList` to `md:grid-cols-2` with mobile dividers, and add the mobile list variant of `ProgramsTable` (dot, name, date range, status badge). Verify: `detail-sections.test.tsx` asserts that the programs list (`md:hidden`) has 3 rows for 3 applications and that the table is wrapped in `hidden md:block`.

## 8. Programs (05.1)

- [x] 8.1 Wrap `EventsTable` in a `hidden md:block` horizontal scroll frame, and make `EventsTabs` scroll horizontally with `EventsToolbar` wrapping. Verify: `events-view.test.tsx` passes with queries scoped to the table.
- [x] 8.2 Add `EventCardList` (`md:hidden`), reusing the existing cell renderers. Each card shows the name link with colour dot, date, location and partner, demand with ratio badge, instructors, status and the "Műveletek: <name>" menu. Add the floating "Új program" link (`md:hidden`, positioned with `--shell-bottom`) and, per the event-list spec, a horizontally scrollable filter-chip row on mobile (instead of the dialog used for applicants). Verify: tests cover the "62 / 20 fő" + "3,1×" card scenario, the name link href, the FAB linking to `/events/new`, and the actions menu item.

## 9. Forms without boards (04.2, 05.2)

- [x] 9.1 Make the applicant edit form and `event-form.tsx` responsive: field grids `grid-cols-1 md:grid-cols-2`, side cards below the form under `xl`, the event form section nav `hidden xl:flex`, and full-width action buttons on mobile. Verify: the form tests still pass, and class assertions cover the grid and the side column order.

## 10. Integration

- [x] 10.1 Run the full gate. Verify: `npm run lint`, `npm run typecheck`, `npm test` (in PowerShell), `npm run format:check`, `npm run build` and `openspec validate make-admin-responsive` all pass.
- [ ] 10.2 Check manually in `npm run dev` (browser device toolbar) at 360, 390, 767, 768, 820, 1024, 1279, 1280 and 1440 px on `/login`, `/`, `/applicants`, `/applicants/{id}`, `/applicants/{id}/edit`, `/events`, `/events/new`. Verify:
    - there is no horizontal page scroll
    - the navigation variant matches the range
    - the floating bars are visible above the bottom nav
    - every spec scenario holds

    Record the results in the PR description.

## Workflow follow-up

- Archive the change after review.
