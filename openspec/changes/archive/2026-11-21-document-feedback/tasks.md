## 1. Verify sync coverage

- [x] 1.1 Confirm `src/app/api/events/[id]/feedback/sync/route.test.ts` covers 401, 404, `SHEET_URL_INVALID`, only-configured sheet, `REAUTH_REQUIRED` and `SHEET_HEADERS_MISSING` {role, missing}; verify with `npx vitest run src/app/api/events`
- [x] 1.2 Add route tests for `SHEET_NOT_ACCESSIBLE` (422) and the generic 500 without details; `npx vitest run src/app/api/events` passes
- [x] 1.3 Add a test for `importFeedbackRows` (mocked `@/lib/db`): `skipDuplicates`, `existing` count on resync, empty rows skipped, error row numbers; `npx vitest run src/lib/feedback` passes

## 2. Verify parsing coverage

- [x] 2.1 Confirm `parse.test.ts` / `parse-override.test.ts` cover required columns, same-second occurrence, placeholder dashes, scales, recommend, participant average and `custom:<label>` storage; add a mentor overall-score test and a "custom answer does not change overall score" test; `npx vitest run src/lib/feedback` passes

## 3. Verify list and UI coverage

- [x] 3.1 Add `parseFeedbackQuery` tests for invalid `role`/`page` fallback and first-value-wins; `npx vitest run src/lib/feedback/list.test.ts` passes
- [x] 3.2 Add stats tests (mocked db): response rate null with `q`, with `role=MENTOR`, and with no attended applicant; recommend rate = yes/answered
- [x] 3.3 Add `feedback-view.test.tsx` cases for both empty states and the anonymity note in the drawer; add a `syncMessage` test in a new `feedback-sync-button.test.tsx`
- [x] 3.4 Add a test (or manual check) that the program tab ignores `period` and an `open` id of another program, and hides the sync button without sheets
- [x] 3.5 Run `openspec validate document-feedback --strict`, `npm test` and `npm run lint`; all pass

## Workflow follow-up

- Archive with `openspec archive document-feedback` after review.
