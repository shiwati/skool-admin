# Proposal

## Why

The Jelentkezők list shows a row of summary data per applicant, but staff cannot see everything about one applicant: all parent details, every program they applied to, their form answers, or what changed on the record. Design board 04.1 "Jelentkező adatlap" covers this view. It is the natural next step after the list and the base for the later edit screen (04.2).

## What Changes

- New page at `/applicants/{id}` (inside the admin shell, "Jelentkezők" menu item active). Its data is loaded by the page itself on the server, by applicant id, straight from the database before rendering. **No new API endpoint.**
- Layout follows board 04.1, limited to fields that exist in the data model:
    - Breadcrumb "Jelentkezők › {név}".
    - Header: initials avatar, name, badges for the latest application status, "16+" (from birth year), "Hírlevél" and "Alumni" (has an attended program). A meta line shows "Létrehozva {dátum}" and the last modification time. The design's short id ("J-2026-0412") is left out because no such field exists.
    - "Személyes adatok" card: name, birth year with age, e-mail, phone, school, hometown.
    - "Szülő / gondviselő" card: name, mother's name, address, e-mail, phone.
    - "Programok" table: every application with program (colour dot), program dates, status badge and application date, plus a summary line ("N jelentkezés · M elvégzett").
    - "Jelentkezési űrlap válaszai" card for the latest application's free-text answers.
    - Side column: "Címkék" card (16+ automatic, Hírlevél, Alumni) and "Változástörténet" card from the `History` table for the applicant and its applications, with an empty state.
- Header actions: "Visszaigazolás küldése" and "Szerkesztés" are visible but disabled. A "További műveletek" (⋯) menu offers "Törlés". It reuses the existing GDPR anonymization (`POST /api/applicants/delete`) and confirmation dialog, then returns to the list.
- An unknown id or a deleted (anonymized) applicant shows the not-found page. Personal data of deleted applicants is never rendered.
- Applicants list: clicking a row (outside the checkbox and the row's menu) opens the applicant's detail page. The row is also reachable from the keyboard.
- Left out from board 04.1 (no data behind them): exact birth date, gender, grade, school type, county, settlement type, disadvantaged status, parental consent, attendance counts, feedback ratings, the "Kommunikáció" card and the "Teljes napló" link. Editing (04.2) is a separate change.

## Capabilities

### New Capabilities

- `applicant-detail`: the applicant detail page at `/applicants/{id}`. Covers server-side loading by id, the sections and badges shown, the change-history card, not-found handling for unknown or deleted applicants, and the available or disabled header actions.

### Modified Capabilities

- `applicant-list`: rows become a navigation entry point to the applicant detail page.
- `applicant-anonymization`: the detail page's "Törlés" action becomes a third deletion entry point. After a deletion there, the user is sent back to the list.

## Impact

- **New code:**
    - `src/app/(admin)/applicants/[id]/page.tsx` and `not-found.tsx`
    - a server-only loader `src/lib/applicants/detail.ts` (Prisma query and history mapping)
    - components under `src/components/applicants/detail/`
- **Changed code:**
    - `ApplicantsTable` row click and keyboard handling
    - `DeleteDialog`, reused unchanged or with a small callback change
    - `format.ts` helpers, such as the Alumni flag and date ranges
- **No schema change, no migration, no new endpoint.**
- **Docs:** `docs/frontend.md`, `docs/api.md` (a note that the detail page has no endpoint), `CLAUDE.md` if the project-state line changes.
