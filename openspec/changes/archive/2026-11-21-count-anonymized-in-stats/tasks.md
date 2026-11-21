## 1. Code

- [x] 1.1 `src/lib/dashboard/load.ts`: remove `activeApplicant` and its uses; replace the comment with one stating anonymized applicants count in every metric
- [x] 1.2 `src/lib/reports/load.ts`: drop `applicant: { deletedAt: null }` from the ATTENDED participant count
- [x] 1.3 `src/lib/feedback/list.ts` ("Kitöltési arány"): drop `applicant: { deletedAt: null }` from the response-rate ATTENDED count
- [x] 1.4 Confirm no other aggregate query filters on `deletedAt` (see design.md table)

## 2. Tests

- [x] 2.1 `src/lib/dashboard/load.test.ts`: update the two "non-deleted" tests to assert no `deletedAt` condition in the application count, `_count`, status `groupBy` and demographics queries; rename them to say anonymized applicants are counted
- [x] 2.2 Add a report load test (`src/lib/reports/load.test.ts`, node env, mocked `db`) asserting the ATTENDED count where clause has no `deletedAt` filter)
- [x] 2.3 `src/lib/feedback/list.test.ts`: add a test proving an anonymized attendee is counted in the "Kitöltési arány" denominator (assert the response-rate count has no `deletedAt` filter)
- [x] 2.4 Run `npm run lint`, `npm run typecheck`, `npm test`

## 3. Docs

- [x] 3.1 `docs/data-and-db.md`: next to "Minden jelentkezőt olvasó lekérdezésnek `deletedAt: null`-ra kell szűrnie" add the exception: statisztikák az anonimizált jelentkezőket is számolják
- [x] 3.2 `docs/frontend.md`: replace "Anonimizált jelentkező egyik mutatóba sem számít." with the new rule
- [x] 3.3 `docs/gaps-and-decisions.md`: add a decision row "statisztikák az anonimizált jelentkezőket is számolják"
