# Proposal

## Why

Program creation, editing and deletion, the saved report draft, the template-based Google Doc generation, the bulk status change on the Jelentkezők tab and the Programok CSV export all exist in code but are missing from `openspec/specs` or are described there inaccurately. This change backfills the specs to match current behavior, so future changes have an accurate baseline.

## What Changes

- New `event-editing` capability: `POST /api/events`, `GET`/`PATCH`/`DELETE /api/events/[id]`, the pages `/events/new` and `/events/[id]/edit`, validation rules, History rows and hard deletion.
- `event-report`: document `PUT /api/events/[id]/report` (one saved `EventReport` per event) and rewrite Google Doc generation as a copy of the `REPORT_TEMPLATE_DOC_ID` template filled through the Docs API, with its scopes and error codes. `REPORT_TEMPLATE_DOC_ID` is required; there is no HTML-upload fallback.
- `event-overview`: bulk status change on the program's Jelentkezők tab (`POST /api/events/[id]/applicants/status`) and the content of the program not-found page.
- `event-list`: the "Exportálás CSV-be" action of the Programok page (`src/lib/events/export.ts`).
- No code changes, except the follow-up tasks (route tests, docs).

## Capabilities

### New Capabilities

- `event-editing`: creating, editing and deleting programs through the API and the program form.

### Modified Capabilities

- `event-report`: saved report draft, template-based Google Doc generation and its errors.
- `event-overview`: bulk status change on the Jelentkezők tab, not-found page content.
- `event-list`: CSV export of the filtered programs.

## Impact

Specs only (`openspec/specs/event-editing`, `event-report`, `event-overview`, `event-list`). Follow-up tasks add route tests for `src/app/api/events/[id]/report/route.ts` and update `docs/`.
