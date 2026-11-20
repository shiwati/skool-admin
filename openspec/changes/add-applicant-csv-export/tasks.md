# Tasks

## 1. Split name in the export

- [x] 1.1 Export the applicant's name as "Vezetéknév" and "Keresztnév" columns instead of "Név" (`src/lib/applicants/export.ts`), and update the expectations in `export.test.ts`.

## 2. Spec sync (rest of the export already shipped)

- [x] 2.1 Confirm the export action, column settings handling, file format and feedback match the delta spec (`applicants-view.tsx`, `applicants-header.tsx`, `src/lib/csv.ts`, `src/hooks/use-csv-export.ts`).
- [x] 2.2 Validate the change with `openspec validate add-applicant-csv-export --strict`.
