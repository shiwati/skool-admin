## Why

Importing applicants from a program's Google Form response sheet, and the per-program field mapping that drives it, already exist in code but have no spec. This change backfills specs that describe the current behavior, so later changes have a contract to modify. There is no behavior change.

## What Changes

- Add a spec for the applicant sheet import: `POST /api/events/<id>/sync`, row parsing, `sourceKey` idempotency, duplicate flagging, error codes and the Google access token / scope rules it relies on.
- Add a spec for sheet mappings: `POST /api/sheets/headers`, header matching (keyword defaults and exact saved mappings), the "Mező-megfeleltetés" editor in the program form, and how the applicant and feedback sheet mappings (incl. custom questions) are validated and stored on the program.
- The sync button and toast on the program page stay specified in `event-overview` ("Applicant sheet and sync") and are only referenced.

## Capabilities

### New Capabilities

- `applicant-sheet-import`: importing applications from a program's applicant sheet into applicants and applications, idempotently, with duplicate flagging and error reporting.
- `sheet-mapping`: reading sheet headers and mapping sheet columns to applicant fields or feedback questions, per program.

### Modified Capabilities

None.

## Impact

- Documentation only: `openspec/specs/applicant-sheet-import/`, `openspec/specs/sheet-mapping/` after archive.
- Described code: `src/app/api/events/[id]/sync/route.ts`, `src/app/api/sheets/headers/route.ts`, `src/lib/sheet-import/*`, `src/lib/sheet-mapping/*`, `src/lib/google/{token,sheets,sheet-url}.ts`, `src/components/events/sheet-mapping-editor.tsx`, `Event.*SheetMapping` columns.
- Follow-up testing tasks only (a route test for `/api/sheets/headers`).
