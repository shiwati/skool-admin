# Proposal

## Why

Every admin page is built for a 1440 px desktop. Below roughly 1100 px, three problems appear:

- the fixed 248 px sidebar eats the content area
- tables overflow (the programs table has a hard `min-w-[1000px]`)
- floating bars are positioned against a sidebar that might not be there

Staff also check applicants and programs from tablets and phones, for example on site at a program. The design now has tablet (820 px) and mobile (390 px) boards on the "Reszponzív nézetek" page for screens 01.1, 02.1, 03.1, 04.1 and 05.1. It also has the shared components "Tablet oldalsáv", "Mobil fejléc" and "Mobil alsó navigáció", and a breakpoint note.

## What Changes

- **Breakpoints.** Three layout ranges, matching the design note and using Tailwind's default `md` (768 px) and `xl` (1280 px) screens, so no config change is needed:
    - mobile < 768 px (designed at 390 px, supported down to 360 px)
    - tablet 768–1279 px (designed at 820 px)
    - desktop ≥ 1280 px (designed at 1440 px)

- **Admin shell:**
    - **desktop:** the full sidebar, unchanged
    - **tablet:** an 80 px icon rail with short labels
    - **mobile:** a top bar (logo, "admin" badge, user menu) and a fixed bottom navigation with "Áttekintés", "Jelentkezők", "Programok", "Visszajelzések" and "Több". "Több" opens a sheet with the remaining items.
    - Disabled items stay disabled at every size, and no page scrolls horizontally.
- **Shared page frame.** Smaller paddings on tablet and mobile. Page headers stack, and floating bars (bulk actions, edit save bar) align to the content area at every size.
- **01.1 Login:** stacked layout on tablet and mobile: the brand band on top, the sign-in card below.
- **02.1 Dashboard:**
    - the KPI cards arrange as the design shows: 3 columns on tablet; 2 + 1 full width on mobile
    - the charts stack in one column
    - the period and program controls scroll horizontally on mobile
- **03.1 Applicants:**
    - **tablet:** a wrapping toolbar and a horizontally scrollable table that keeps the user's column choice
    - **mobile:** a card list (avatar, name with 16+, e-mail, age · settlement, history and newsletter badges) that opens the detail page, and the filters inside a "Szűrők" dialog with an active-filter count
    - The existing pager stays. Selection and bulk actions are desktop and tablet only.
- **04.1 Applicant detail:**
    - **tablet:** one column, with the tags and history cards after the main cards
    - **mobile:** the breadcrumb becomes a "‹ Jelentkezők" back link; the header is centred, with full-width actions; key–value lists use one column; the programs table becomes a list
    - No tabs.
- **05.1 Programs:**
    - **tablet:** the phase tabs scroll and the table scrolls horizontally
    - **mobile:** program cards (name with colour dot, date, place, demand, instructors) and a floating "Új program" button
- **Forms without dedicated boards** (04.2 applicant edit, 05.2 program create/edit):
    - one column on mobile, two-column field grids from `md`
    - the side cards move below the form
    - the save bar spans the content width
- **Not covered:** 06.1 and 07.1 (screens not implemented yet). The design's tablet/mobile extras that need new features are also left out: status tabs on the applicants list, the "Visszaigazolás" and "Exportálás" actions, search and notifications in the mobile top bar, and the hamburger menu, since "Több" covers the remaining items.

## Capabilities

### New Capabilities

- `responsive-layout`: the breakpoint ranges and cross-page rules (no horizontal page scroll, minimum supported width, touch target size, page frame spacing, floating-bar placement). Also the responsive layouts of pages without their own spec: login, dashboard, and the applicant and program forms.

### Modified Capabilities

- `admin-shell`: the shell adapts per breakpoint (sidebar, tablet rail, mobile top bar with bottom navigation and the "Több" sheet).
- `applicant-list`: the mobile card list, the mobile filter dialog, and the tablet table behaviour. Selection is not offered on mobile.
- `applicant-detail`: the single-column layout on tablet and mobile, the mobile back link and header, and the mobile programs list.
- `event-list`: tablet table scrolling and the mobile program cards with a floating "Új program" button.

## Impact

- **Changed code:**
    - `src/app/(admin)/layout.tsx` and `src/components/admin-shell/*`: new rail, mobile top bar, bottom navigation, and the "Több" sheet
    - `PageShell`, `PageHeader`, `Breadcrumb`
    - `src/app/login/page.tsx`
    - the dashboard page and cards
    - `src/components/applicants/*`: a new mobile card list, a filter dialog, responsive toolbar, header and bulk bar
    - `src/components/applicants/detail/*` and the detail page
    - `src/components/applicants/edit/*`
    - `src/components/events/*`: table wrapper, mobile cards, floating action, tabs
    - `event-form.tsx`
- **Not changed:** the API and the data model. No new dependencies: the sheet and dialog reuse the existing Radix `dialog`.
- **Tests:** component tests assert the responsive markup (classes and rendered alternatives). jsdom has no layout, so real rendering is checked manually at 390, 820 and 1440 px.
- **Docs:** `docs/frontend.md` (breakpoints and patterns).
