# Tasks

## 1. Shared schema

- [x] 1.1 Add `src/lib/applicants/edit-schema.ts` per design §1:
    - `applicantEditSchema`, which enforces:
        - required last name, first name and e-mail
        - e-mail format, with "Érvénytelen e-mail cím"
        - birth year in 1900..current year
        - the phone pattern and its 6–20 digits
        - max 200 characters
    - `applicantEditRequestSchema`, which adds `expectedUpdatedAt`
    - `toApplicantUpdate`, converting empty values to `null` and the birth year to a number
    - `toApplicantFormValues`, mapping the DB shape to form strings

    Verify: `edit-schema.test.ts` covers each rule, including `nagy.luca@gmail` being rejected, trimming, empty optional values becoming `null`, the birth-year bounds, valid and invalid phone numbers, and the round trip through `toApplicantFormValues` and `toApplicantUpdate`.

## 2. Update service

- [x] 2.1 Add the pure `diffApplicant(current, next)` in `src/lib/applicants/update.ts`. It stringifies values, with `null` kept as `null`, numbers as strings and booleans as `"true"`/`"false"`. Verify: unit tests cover an unchanged result (empty), a changed phone number, `null` → value, a boolean change and a birth-year number change.
- [x] 2.2 Implement `updateApplicant(db, id, data, expectedUpdatedAt, actorUserId)` per design §5:
    - the transaction
    - `ApplicantNotFoundError` and `ApplicantConflictError`
    - the compare-and-set `updateMany` on `updatedAt`
    - the History `createMany` with `tableName: "applicant"`
    - recomputing the duplicate key and flags for the old and new keys, reusing `duplicateKey()`

    Verify: `update.test.ts` (node environment, mocked transaction client) covers seven cases:
    - Not found or deleted throws NotFound with no writes.
    - A stale `expectedUpdatedAt` throws Conflict with no writes.
    - `updateMany` returning count 0 throws Conflict.
    - An unchanged save performs no writes and returns `changed: 0`.
    - A phone change writes exactly one History row with the old and new values and the actor.
    - An e-mail change stores the new key and recomputes flags for both keys.
    - A non-name change leaves `duplicateKey` untouched.

## 3. Endpoint

- [x] 3.1 Add `src/app/api/applicants/[id]/edit/route.ts` (`POST`, `runtime = "nodejs"`, `dynamic = "force-dynamic"`) per design §4. Verify: `route.test.ts` (node environment, mocked `@/lib/session`, `@/lib/db`, `@/lib/logger`, update service) covers:
    - `401` without a session or `user.id`
    - `400` for malformed JSON and for an invalid e-mail, with `details.fieldErrors.email`
    - `404`, `409` and `500` without details
    - `200 { updatedAt }` with `no-store`
    - the log payload being exactly `{ event, userId, changed }`
- [x] 3.2 Document the endpoint in `docs/api.md`: the write-endpoint list and a section covering body, responses and History. Update the History section in `docs/data-and-db.md` (editing now writes per-field entries; the anonymization scrub covers them). Verify: `npm run format:check` passes.

## 4. Edit page and form

- [x] 4.1 Add `getApplicantForEdit(id)` (`cache()`, `deletedAt: null`, editable fields plus `updatedAt`) to `src/lib/applicants/detail.ts`. Verify: `detail.test.ts` covers the `deletedAt: null` filter and that the selection excludes `duplicateKey`.
- [x] 4.2 Add the `ApplicantEditForm` Client Component in `src/components/applicants/edit/` following board 04.2, using `PageShell`, `Breadcrumb`, `PageHeader` (with a "Mégse" link), `FormField` and `FormErrorSummary` ("N mező javításra szorul"). It has:
    - the "Személyes adatok" and "Szülő / gondviselő" cards, with the required markers and the phone hint
    - the side cards "Mit naplózunk?" and "Automatikus mezők"
    - the floating save bar ("N nem mentett módosítás", "Elvetés", "Mentés")
    - a `beforeunload` guard while dirty
    - the save flow per design §6: success toast and navigation, server field errors, the 409 conflict alert with "Újratöltés", and the generic error toast

    Verify: `applicant-edit-form.test.tsx` (mocked `next/navigation` and `fetch`) covers:
    - pre-filled values
    - the bar hidden while clean, and "2 nem mentett módosítás" after two edits
    - "Elvetés" restoring the values
    - an invalid e-mail showing "Érvénytelen e-mail cím", the summary "1 mező javításra szorul", and no request
    - a successful save posting the values with `expectedUpdatedAt`, then toasting and pushing `/applicants/{id}`
    - a server `400` field error appearing on the field
    - a `409` showing the conflict message with the values kept
    - a `500` showing the generic error

- [x] 4.3 Add `src/app/(admin)/applicants/[id]/edit/page.tsx` (`requireAdmin` → loader → `notFound()`, `generateMetadata` "Szerkesztés · {név}") and `not-found.tsx`. Verify: `page.test.tsx` covers four cases:
    - No session means no loader call.
    - `null` calls `notFound`.
    - An existing applicant renders the heading "Adatlap szerkesztése" and the breadcrumb.
    - The metadata title is set.
- [x] 4.4 Update `docs/frontend.md` with the `/applicants/[id]/edit` entry: server pre-fill, shared schema, save bar, conflict handling. Verify: `npm run format:check` passes.

## 5. Detail page

- [x] 5.1 In `ApplicantDetailActions`, make "Szerkesztés" a link to `/applicants/{id}/edit`, keeping "Visszaigazolás küldése" disabled. In `detail-labels.ts`, map `newsletter` history values to "Igen"/"Nem". Verify:
    - `applicant-detail-actions.test.tsx` asserts that the "Szerkesztés" link `href` is the edit URL and that "Visszaigazolás küldése" stays disabled.
    - `detail-labels.test.ts` asserts that `historyValue("newsletter", "true")` is "Igen".

## 6. Integration

- [x] 6.1 Run the full gate. Verify: `npm run lint`, `npm run typecheck`, `npm test` (in PowerShell), `npm run build` and `openspec validate add-applicant-edit` all pass.
- [x] 6.2 Run a smoke test against `npm run dev` with a temporary local session, and remove the test data afterwards:
    - The edit page renders pre-filled.
    - A POST with a changed phone returns 200 and creates one History row.
    - A repeated POST with the old `expectedUpdatedAt` returns 409.
    - An invalid e-mail returns 400.
    - A deleted applicant returns 404.

    Verify: all responses are observed, then the seed is restored with `npm run db:seed:reset`.

## Workflow follow-up

- Do the manual browser check of the save bar, error summary focus and conflict alert.
- Archive the change after review.
