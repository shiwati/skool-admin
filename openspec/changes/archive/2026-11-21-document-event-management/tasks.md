# Tasks

## 1. Docs

- [x] 1.1 Mark `docs/plans/report-google-doc-template.md` as done/superseded, and record the decision that `REPORT_TEMPLATE_DOC_ID` is required (no HTML fallback) in `docs/gaps-and-decisions.md`

## 2. Tests

- [x] 2.1 Add route tests for `PUT src/app/api/events/[id]/report/route.ts` (401, 400 invalid JSON, 400 invalid content, 404 unknown event, 200 saved, 500 on DB error)
- [x] 2.2 Verify that every scenario in the `event-editing` delta is covered by tests (`src/app/api/events/route.ts` POST, `src/app/api/events/[id]/route.test.ts`, `src/components/events/event-form.test.tsx`); add missing ones
- [x] 2.3 Verify the `event-report` scenarios (saved draft, generation errors 422/503/403/502, both scopes) are covered, including `src/app/api/events/[id]/report/documents/route.test.ts`; add missing ones
- [x] 2.4 Verify the `event-overview` scenarios (bulk status route, capacity warning, not-found page) and the `event-list` CSV export scenario are covered (`src/lib/events/export.test.ts`, `events-view.test.tsx`); add missing ones

## 3. Wrap-up

- [x] 3.1 Run `openspec validate document-event-management --strict` and archive the change once the tasks are done
