# Design

## Context

- **Current layout.** The UI is Tailwind v4 with shadcn/ui primitives. All layouts assume a desktop width:
    - `(admin)/layout.tsx` is a fixed `grid-cols-[248px_minmax(0,1fr)]`.
    - `PageShell` always pads `px-8`.
    - The events table has `min-w-[1000px]`.
    - The applicant edit save bar is `fixed left-[calc(248px+2rem)]`.
    - A few pages already use responsive prefixes inconsistently (`sm:`, `lg:`, `xl:`).
- **Design source.** The "Reszponzív nézetek" design page has tablet (820 px) and mobile (390 px) boards for 01.1, 02.1, 03.1, 04.1 and 05.1. It also has three shared components (`TRail`, `MTop`, `MTab`) and a note fixing the ranges: desktop ≥ 1280, tablet 768–1279, mobile < 768.
- **Test environment.** Tests run in jsdom, which applies no CSS and has no layout, so `display: none` variants are present in the test DOM.

## Breakpoint proposal

| Range   | Width       | Tailwind                 | Designed at | Shell                         | Lists                      |
| ------- | ----------- | ------------------------ | ----------- | ----------------------------- | -------------------------- |
| Mobile  | 360–767 px  | (base)                   | 390 px      | top bar + bottom nav + "Több" | cards, filters in a dialog |
| Tablet  | 768–1279 px | `md:`                    | 820 px      | 80 px icon rail + topbar      | table, horizontal scroll   |
| Desktop | ≥ 1280 px   | `xl:` (Tailwind default) | 1440 px     | 248 px sidebar + topbar       | table (unchanged)          |

- **Why these values.** They are exactly the design note's ranges, and they coincide with Tailwind's default `md` (48 rem) and `xl` (80 rem) screens, so `globals.css` needs no custom `--breakpoint-*`.
- **Why 768 for mobile/tablet.**
    - Portrait tablets (768–834) get the rail.
    - Large phones in landscape (≈ 844–932) also land on tablet, which is acceptable because the rail is compact.
- **Why 1280 for desktop.** The 248 px sidebar plus a 1000+ px table needs ≥ 1280 px. Below that, the rail saves 168 px. Small laptops and landscape tablets (1024–1279 px) therefore get the rail, not the full menu.
- **Unused screens.** `sm` (640) and `lg` (1024) are not layout ranges. They may be used only for minor in-range tweaks (for example the dashboard's lower row). Existing `sm:` uses in touched files are normalised to `md:`, so the code speaks the same three ranges.
- **Minimum width.** 360 px. Nothing is promised below it.

## Goals / Non-Goals

**Goals:**

- Server-rendered, CSS-only switching: no hydration mismatch, no layout flash, no JS media queries.
- One component tree per page. Alternative renderings (table vs. cards, sidebar vs. rail vs. bottom nav) exist only where the designs differ structurally.
- Floating UI positioned from one shell variable instead of hard-coded sidebar widths.

**Non-Goals:**

- New features shown only on tablet/mobile boards: status tabs, export, confirmation e-mails, global search, notifications, the hamburger drawer, and the "Továbbiak betöltése" incremental loading.
- Responsive layouts for screens not built yet (06.1, 07.1).
- Visual regression tooling. Manual checks at 390/820/1440 px cover real layout.

## Decisions

### 1. CSS visibility instead of `useMediaQuery`

Where the markup differs, both variants are rendered and toggled with Tailwind's `hidden md:block` / `md:hidden` (and `xl:` likewise).

- **Why.** A JS media-query hook has no correct server snapshot: phones would get the desktop markup first and then swap. CSS keeps the first paint correct, works with Server Components, and needs no client state.
- **Cost:**
    - The DOM has both variants: up to 100 extra card nodes on a list page.
    - Tests must scope queries to a container (`within(screen.getByRole("table"))`, `getByRole("list", { name: … })`), because jsdom sees both.
- **Assistive technology.** `display: none` removes a variant from the accessibility tree, so each user meets exactly one.

### 2. Shell structure and shell variables

`(admin)/layout.tsx` becomes:

```text
<div class="min-h-screen bg-canvas md:grid md:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]
            [--shell-left:0px] md:[--shell-left:80px] xl:[--shell-left:248px]
            [--shell-bottom:calc(72px+env(safe-area-inset-bottom))] md:[--shell-bottom:0px]">
  <MobileTopBar class="md:hidden" />              (sticky top, 56 px)
  <aside class="sticky top-0 hidden h-screen md:block">
    <AdminRail class="xl:hidden" /> <AdminSidebar class="hidden xl:flex" />
  </aside>
  <div class="flex min-w-0 flex-col">
    <AdminTopbar class="hidden md:flex" />
    <main class="flex-1 pb-[var(--shell-bottom)]">{children}</main>
  </div>
  <MobileTabBar class="md:hidden" />              (fixed bottom, 72 px + safe area)
</div>
```

- **Shell variables.** `--shell-left` and `--shell-bottom` let every floating element compute its position without knowing the breakpoint:
    - bulk bar and save bar: `left-[calc(var(--shell-left)+1rem)] md:left-[calc(var(--shell-left)+2rem)] bottom-[calc(var(--shell-bottom)+1rem)]`
    - FAB: `bottom-[calc(var(--shell-bottom)+1rem)]`
- **Shared menu data.** `AdminRail`, `MobileTabBar` and `MoreSheet` derive their items from `nav-items.ts`, which gains `shortLabel`, a `mobile: "tab" | "more"` placement and an "Adatok" rail grouping. This keeps a single source of menu truth, with `isActive` and the disabled handling shared.
- **"Több" sheet.** A Radix `Dialog` styled as a bottom sheet. No new dependency.
- **Mobile top bar.** It reuses `UserMenu` in an avatar-only trigger mode.

### 3. Page frame

- **`PageShell`.** `px-4 pt-5 pb-8 md:px-6 md:pt-6 xl:px-8 xl:pt-7 xl:pb-28`. The large desktop bottom padding exists only for floating bars. On mobile, `main` already reserves `--shell-bottom`.
- **`PageHeader`.** Already `flex-wrap`. Actions get `w-full md:w-auto` on mobile, plus an optional `mobileActions` slot so lists can collapse secondary actions into a "További műveletek" menu.
- **`Breadcrumb`.** Gains a `mobileBack` mode: below `md` it renders only "‹ {parent}" as a link.

### 4. Lists: shared wrapper, separate renderers

- **Applicants:**
    - `ApplicantsTable` keeps the `<table>` (wrapped `hidden md:block`, inside an `overflow-x-auto` frame whose table keeps `table-fixed` with a sensible `min-w` per visible column count).
    - A new `ApplicantCardList` (`md:hidden`, `<ul aria-label="Jelentkezők">`) reuses the formatters from `format.ts` and `columns.tsx` helpers.
    - The pager renders once, below both.
    - Loading, empty and error states move into a small shared `ListState` used by both, so they don't diverge.
- **Events:** `EventsTable` likewise gets an `EventCardList`, reusing the existing cell renderers, which are already split into small functions in `events-table.tsx`. `min-w-[1000px]` stays only inside the `md:` scroll frame.
- **Toolbars:**
    - On mobile, `ApplicantsToolbar` and `EventsToolbar` render search + "Szűrők" button + `Dialog`.
    - The dialog body renders the same `FilterChip`/`TagFilter` components stacked vertically. They are already self-contained popovers bound to the URL state, so no filter logic is duplicated.
    - On tablet and desktop, the chips render inline as today, wrapping.

### 5. Detail page

- **Layout.** The grid is already `xl:grid-cols-[…]`, so below `xl` it is one column. Only the source order is checked against the spec.
- **`KeyValueList`.** Changes from `sm:grid-cols-2` to `md:grid-cols-2`, with mobile row dividers (`divide-y md:divide-y-0`).
- **`ProgramsTable`.** Gets a `md:hidden` list variant.
- **Header:**
    - centred below `md`
    - avatar `size-16 md:size-14`
    - actions wrapper `w-full md:w-auto` with `flex-1` buttons

### 6. Login, dashboard and forms

- **Login.** Replace the flex-basis wrapping with explicit `flex-col xl:flex-row`. This is more predictable than `flex-[1_1_520px]` wrapping, which currently switches at ~1100 px. Then apply the mobile sizes from 01.1 M.
- **Dashboard:**
    - KPI grid `grid-cols-2 md:grid-cols-3`, with the third card `col-span-2 md:col-span-1`
    - charts `grid-cols-1 xl:grid-cols-[…]`
    - lower row `grid-cols-1 lg:grid-cols-2` (unchanged)
    - `DashboardActions` wrapper becomes `-mx-4 flex overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0`
- **Forms:**
    - field grids `grid-cols-1 md:grid-cols-2`
    - side columns `xl:` only
    - the event form's sticky section nav `hidden xl:flex`
    - the applicant save bar uses the shell variables

## Risks / Trade-offs

- **[Risk] Tests see both variants and break or turn ambiguous.** → Each touched test scopes its queries. A small helper asserts the visibility classes (`expect(el).toHaveClass("md:hidden")`) to pin which variant is meant for which range.
- **[Risk] Duplicate element ids** when a component with fixed ids renders in two variants (for example tooltip description ids). → Variants are only created for list rows, cards and nav. Components with ids (headers, dialogs, forms) are restyled, not duplicated. `useId` is used where a duplicate is unavoidable.
- **[Trade-off] Bulk actions unavailable on phones.** This matches the design and was the user's choice. It is documented in the spec.
- **[Trade-off] Rail on small laptops.** 1024–1279 px screens (small laptops, landscape tablets) get the icon rail instead of the full menu. Chosen to follow the design note and to give the 1000+ px tables room.
- **[Trade-off] Doubled DOM on lists.** At most 100 rows × 2. Acceptable.
- **[Risk] iOS safe area under the bottom nav.** → `env(safe-area-inset-bottom)` in `--shell-bottom`. Next.js' default viewport meta needs `viewport-fit=cover` for this. Export `viewport` from the root layout with `viewportFit: "cover"`.
- **[Risk] No automated layout verification.** → A manual checklist task at 360, 390, 767, 768, 820, 1024, 1279, 1280 and 1440 px in the dev server covers the spec scenarios.

## Migration Plan

UI-only and fully reversible. No data or API change. It can ship page by page behind no flag, because each page degrades gracefully: the shell change first, then the pages.
