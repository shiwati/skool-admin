# Tasks

## 1. Column card renderers

- [x] 1.1 Add an optional `card` renderer to `ColumnDef` in `src/components/applicants/columns.tsx` for `age`, `location`, `newsletter`, `history` and `parent`, with the values in design §1. Add an exported `cardValue(id, item, now)` helper that falls back to `cell`. Verify: a `columns.test.tsx` case checks each card value for the Nagy Luca fixture: "16 év", "Budapest · Gimnázium", "Feliratkozott", "1 program", "Nagy Éva · nagy.eva@gmail.com". It also checks the fallbacks: "—" for a missing phone, and "—" without a newsletter subscription or attended program.

## 2. Cards follow the column settings

- [x] 2.1 Give `ApplicantCardList` a `columns` prop and render the body as a `<dl>` with one labelled row per visible non-`name` column, in order (design §2). Remove the fixed age/place line and the badges. Pass `columns` from `ApplicantsTable`. Verify: `applicant-card-list.test.tsx` covers four cases:
    - the default-columns scenario: labels in order, and the values
    - hiding `newsletter` removes the "Hírlevél" row
    - showing `phone` first puts "Telefonszám" directly below the header
    - the header still shows the name, "16+" and e-mail with `columns: ["name"]`, with no body rows

## 3. Picker on mobile

- [x] 3.1 Add a `compact` mode to `ColumnPicker`: a 44 px icon trigger (`Columns3`) with the accessible name "Oszlopok", and the popover width clamped to `min(300px, 100vw − 2rem)`. Verify: `column-picker.test.tsx` asserts that the compact trigger opens the "Oszlopok a listában" panel and has `size-11`.
- [x] 3.2 Add a `mobileTrailing` slot to `ApplicantsToolbar`, rendered `md:hidden` after the "Szűrők" button. In `ApplicantsView`, pass `<ColumnPicker compact />` bound to the same settings. Update the applicant-list docs line in `docs/frontend.md`. Verify:
    - the toolbar test asserts that the slot container has `md:hidden` and comes after the "Szűrők" button
    - a view test (mocked localStorage) turns off "Hírlevél" through the compact picker, and both the cards and the table lose it

## 4. Integration

- [x] 4.1 Run the full gate. Verify: `npm run lint`, `npm run typecheck`, `npm test` (in PowerShell), `npm run format:check`, `npm run build` and `openspec validate mobile-column-settings` all pass.
- [x] 4.2 Check in a headless browser at 360, 390 and 820 px on `/applicants`. Verify:
    - there is no horizontal overflow
    - the "Oszlopok" icon button is visible only below 768 px
    - the panel fits the 360 px screen
    - toggling "Telefonszám" adds and removes the card line

## Workflow follow-up

- Archive the change after review.
