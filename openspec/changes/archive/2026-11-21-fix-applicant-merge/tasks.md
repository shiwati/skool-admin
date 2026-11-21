# Tasks

## 1. Merge endpoint

- [x] 1.1 Load applicants with `deletedAt: null`; return `404` when any id is missing or deleted; verify with a route test using an anonymized id.
- [x] 1.2 Return `409` when any key is null or the keys differ, changing nothing; verify with a route test that asserts no application/History/delete call happened.
- [x] 1.3 Move the merged applicants' `applicant` History rows to the kept applicant before writing `merged_from` rows; verify with a route test on the `history.updateMany` call.
- [x] 1.4 Add `deletedAt: null` to the flag recount; update the doc comment (hard delete is intentional); `npx vitest run src/app/api/applicants/merge` passes.

## 2. Re-import after merge

- [x] 2.1 Add a test in `src/lib/sheet-import/import.test.ts`: a row whose application (same `sourceKey`) now belongs to another applicant is counted as `existing` and creates no applicant; `npx vitest run src/lib/sheet-import` passes.

## 3. Docs

- [x] 3.1 `CLAUDE.md` Database bullet: GDPR deletion anonymizes; duplicate merge hard-deletes the merged applicant (its applications and History move to the kept one). Verify by reading the bullet.
- [x] 3.2 `docs/gaps-and-decisions.md` decision log + duplicate section, `docs/domain.md` History writers: record the same rule. Verify by reading.

## 4. Integration

- [x] 4.1 `npm run lint`, `npm run typecheck`, `npm test` pass.

## Workflow follow-up

- Run `openspec-verify-change`, then archive the change.
