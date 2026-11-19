# Proposal

## Why

Staff currently have no way to see who has applied: `GET /api/applicants` exists, but no screen uses it, and the signed-in area is a placeholder page with no navigation. The "Jelentkezők" screen (design boards 03.1 "Jelentkezők / Lista" and 03.2 "Kijelölés, tömeges műveletek, oszlopok") is the first real workflow in the admin app. Deleting an applicant must also meet GDPR: their personal data has to go, while the anonymous history the program reports depend on has to stay.

## What Changes

- New shared admin shell for every page under `(admin)`. It has the sidebar from the design (Skool logo, "admin" badge, main menu, "Adatok" section) and a topbar with the signed-in user and sign-out. Menu items for screens that don't exist yet are shown but disabled. The sidebar's "Google Sheet szinkron" status card is left out until a sync exists.
- New page at `/applicants`. It lists applicants from `GET /api/applicants`, using only the endpoint's existing query parameters:
    - search (`q`)
    - filter chips: Program (`eventIds`), Életkor (`ageFrom`/`ageTo`), Település (`hometown`), Hírlevél (`newsletter`), Részt vett (`attended`)
    - sortable columns and server-side paging
    - filter, sort and page state kept in the URL
    - empty, loading and error states following design board 09.1
- Page header actions:
    - "Szinkronizálás" is visible but disabled.
    - "E-mail lista" opens a dialog with the e-mail addresses of _all_ applicants matching the current filters, comma-separated, ready to copy.
    - "Visszaigazolás küldése" and "Exportálás" from the design are left out.
- Duplicate-applicants banner: shown as in the design, with no detection or action behind it yet. Its "Ellenőrzés" button is disabled.
- Row selection (per row, and all rows on the current page) with the floating bulk-action bar from 03.2. It offers only "E-mail címek másolása" (comma-separated), "Törlés" and clearing the selection. The design's "Visszaigazolás küldése", "Státusz módosítása" and "Exportálás" bulk actions are left out. Status changes will live on a future program-applications screen.
- Column picker ("Oszlopok a listában"): choose which columns are shown and in what order (drag, with a keyboard-accessible alternative), plus "Alapértelmezés visszaállítása". Saved per browser in `localStorage`.
- Applicant deletion as GDPR anonymization (soft delete):
    - Personal data is overwritten.
    - Applications are kept, with their free-text answers cleared.
    - Personal values are removed from the change log (`History`).
    - Who deleted the applicant, and when, is recorded.
    - Deleted applicants are excluded from `GET /api/applicants`.
    - Deletion cannot be undone and asks for confirmation.
- **BREAKING (data):** a new database migration. It creates the domain tables that are already in `schema.prisma` but have no migration yet, and adds `deletedAt`/`deletedById` to `Applicant`.

## Capabilities

### New Capabilities

- `admin-shell`: the shared navigation frame around every signed-in admin page (sidebar menu, active item, disabled future items, topbar with the current user and sign-out).
- `applicant-list`: browsing applicants. Covers the list and its columns, search, filters, sorting, paging, URL state, the column picker, selection, copying e-mail lists, the disabled sync and duplicate-check placeholders, and the empty, loading and error states.
- `applicant-anonymization`: GDPR deletion of applicants by anonymization. Covers which data is removed or kept, the audit record, excluding deleted applicants from listings, and authorization. The future applicant data-sheet delete (design board 04.3) will reuse it.

### Modified Capabilities

None. `admin-auth` already requires that signed-in admins can sign out from admin pages. The sign-out button moves into the topbar, and that requirement still holds.

## Impact

- **Pages/UI:**
    - `src/app/(admin)/layout.tsx` (shell)
    - new `src/app/(admin)/applicants/` route
    - `src/app/(admin)/page.tsx` (sign-out moves to the topbar)
    - new shadcn/ui primitives (for example dialog, checkbox, popover, dropdown-menu, input)
- **API:**
    - `GET /api/applicants` gets a fixed `deletedAt: null` filter, with no new query parameters
    - new `POST /api/applicants/delete` for anonymizing the selected applicants
- **Database:** a new Prisma migration (domain tables plus soft-delete columns). Every environment must run `npm run db:deploy`.
- **Data protection:** anonymization is irreversible by design. The `History` table loses the personal values of deleted applicants.
- **Out of scope:**
    - Google Sheet sync
    - duplicate detection (03.4)
    - confirmation e-mails (03.5)
    - export (03.7)
    - the status tabs and the Státusz and Megye filters (the API doesn't support them)
    - bulk status change
    - the applicant data sheet (04.x)
