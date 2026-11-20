# Proposal

## Why

On phones the applicants list shows fixed cards, and the column picker is hidden below 768 px. Staff who rely on specific information, such as the phone number, the parent's contact, the program or the status, cannot get it on mobile. Staff who want a shorter list cannot drop lines they do not need. The column settings already persist in the browser, so the same choice should shape the mobile cards too.

## What Changes

- **The "Oszlopok" button is available on mobile.** A 44 px icon button with the accessible name "Oszlopok" sits next to the search field and the "Szűrők" button. It opens the same "Oszlopok a listában" panel with the same settings: show/hide, reorder, and "Alapértelmezés visszaállítása".
- **Cards follow the column settings.**
    - The card header (initials avatar, name with the "16+" badge, e-mail) stays as the fixed "Név / e-mail" part. That column cannot be hidden on desktop either.
    - Below the header, every other visible column becomes one labelled line ("Életkor", "Program", "Státusz", "Település / iskola", "Hírlevél", "Előzmény", "Jelentkezett", "Szülő", "Telefonszám"), in the configured column order.
    - Hidden columns have no line, and turning a column on, for example "Telefonszám", adds its line.
- **The default card changes.** With the default settings, the card shows Életkor, Program, Státusz, Település / iskola, Hírlevél, Előzmény and Jelentkezett as labelled lines. This replaces today's fixed "{életkor} év · {település}" line and badges.
- **One setting for both layouts.** Mobile and desktop share it, so a change made on the phone also changes the desktop table in the same browser, and the other way round.
- **Unchanged on mobile:** there is still no row selection and no bulk-action bar.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `applicant-list`:
    - "Mobile applicant cards" now builds the card lines from the visible columns and their order, and no longer excludes the column picker.
    - "Column picker" becomes available at every width, on mobile through an icon button.

## Impact

- **Code:**
    - `src/components/applicants/applicant-card-list.tsx`: card body from columns.
    - `src/components/applicants/columns.tsx`: optional mobile renderer per column.
    - `src/components/applicants/column-picker.tsx`: compact icon trigger.
    - `applicants-toolbar.tsx` and `applicants-view.tsx`: wiring the picker into the mobile row.
    - `applicants-table.tsx`: passes the visible columns to the card list.
    - Tests for these.
- **No API, data or storage change:** the same localStorage key and format.
- **Docs:** `docs/frontend.md`, the applicants list description.
