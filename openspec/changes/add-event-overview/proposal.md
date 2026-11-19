# Proposal

## Why

The program list and the new/edit forms already link to `/events/<id>`, but the page does not exist yet and shows "not found". The design boards (05.3, 05.4) give the program page a header and several tabs. This change builds the page and its first tab, "Áttekintés" (overview). There is no board for the overview itself, so it is composed from the boards' header and KPI cards, the program form, and the applicant detail page.

## What Changes

- New page `/events/<id>` (admin only) with a program header, a tab bar, and the overview tab.
- Header: breadcrumb, name, tag pills, status badge, date/place/people line, "Szerkesztés" button to `/events/<id>/edit`.
- Tab bar: "Áttekintés" (current), "Jelentkezők" (links to the applicants list filtered to the program), and "Visszajelzések", "Záró riport", "Változástörténet" shown disabled until those screens exist.
- Overview: four KPI cards (capacity, applied, accepted, waitlist), applications by status, program details, instructors and mentors, the applicant sheet with a "Szinkronizálás most" button (existing `POST /api/events/<id>/sync`), and the latest changes from `History`.
- Unknown id shows a "not found" page.
- Out of scope: the other tabs' own pages, report generation, bulk status changes.

## Capabilities

### New Capabilities

- `event-overview`: the program page and its overview tab.

### Modified Capabilities

- `applicant-list`: the disabled "Szinkronizálás" placeholder is removed from the page header; the real sync button is on the program page.

## Impact

- **Code:** new `src/app/(admin)/events/[id]/{layout,page,not-found}.tsx`, `src/components/events/overview/*`, `src/lib/events/overview.ts`, `src/lib/events/history-labels.ts`. Small refactors: `emptyCounts` exported from `src/lib/events/list.ts`; tag and avatar colours moved from `events-table.tsx` to a shared module.
- **API, data:** no change. The page reads the database on the server, like the applicant detail page.
