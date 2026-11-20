# Proposal

## Why

The Jelentkezők list can already be exported to CSV, but no spec describes it. The export now needs the applicant's name in two columns ("Vezetéknév" and "Keresztnév") instead of one "Név" column, so the names can be sorted, merged into letters and imported elsewhere. This change records the export's behaviour, including the split name.

## What Changes

- An "Exportálás CSV-be" action on the Jelentkezők page downloads every applicant that matches the current search and filters, not just the current page.
- The CSV follows the user's column settings: only visible columns, in the configured order. Two-line table cells become several CSV columns.
- **BREAKING** (for anyone processing the file): the applicant's name is exported as "Vezetéknév" and "Keresztnév" instead of a single "Név" column. "Szülő neve" stays one column.
- The file is made for Hungarian Excel: semicolon-separated, UTF-8 with BOM, named `jelentkezok-ÉÉÉÉ-HH-NN.csv`. Cells that would run as spreadsheet formulas are neutralized.
- The admin gets feedback: the number of exported rows, a notice when nothing matches, or an error message.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `applicant-list`: CSV export of the filtered applicants, with the applicant's name split into last and first name.

## Impact

- Specs: `openspec/specs/applicant-list/spec.md` after archive.
- Code: the name split is in `src/lib/applicants/export.ts` (tests in `export.test.ts`); the rest of the export already exists (`applicants-view.tsx`, `applicants-header.tsx`, the shared CSV helpers and export hook).
