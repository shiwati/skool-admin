## 1. Verify applicant-sheet-import

- [x] 1.1 Confirm each `applicant-sheet-import` scenario is covered by a test (`src/app/api/events/[id]/sync/route.test.ts`, `src/lib/sheet-import/*.test.ts`); add missing tests
- [x] 1.2 Confirm the re-sync-after-merge test added by `fix-applicant-merge` 2.1 exists in `src/lib/sheet-import/import.test.ts`
- [x] 1.3 Confirm the duplicate count cannot match deleted applicants (anonymization clears `duplicateKey`, see `fix-applicant-merge` design) and add an import test asserting a key match only counts applicants with that non-null key
- [x] 1.4 Add tests for `getGoogleAccessToken` (missing scope, refresh, rejected refresh) and `fetchSheet` (no gid → first worksheet, unknown gid) if missing

## 2. Verify sheet-mapping

- [x] 2.1 Write a route test for `src/app/api/sheets/headers/route.ts` (401, 400, 422 `SHEET_URL_INVALID`, 403 `REAUTH_REQUIRED`, 422 `SHEET_NOT_ACCESSIBLE`, 500, trimmed non-empty headers)
- [x] 2.2 Confirm each `sheet-mapping` scenario is covered by a test (`mapping.test.ts`, `mapping-override.test.ts`, `src/lib/sheet-mapping/schema.test.ts`); add missing tests
- [x] 2.3 Add a component test for the mapping editor states ("Egyéni"/"Alapértelmezett", "(nincs a sheetben)", reset) if missing

## 3. Finish

- [x] 3.1 Run `openspec validate document-sheet-import --strict`, `npm test` and `npm run lint`
