# Design

## Context

- **What already exists.**
    - The detail page (`/applicants/[id]`) is server-rendered. Its loader (`src/lib/applicants/detail.ts`) filters `deletedAt: null`, and the page guards itself with `requireAdmin`.
    - The new-event form (`src/components/events/new-event-form.tsx`) established the form conventions:
        - `useZodForm` with one Zod schema shared by client and server
        - `FormField` / `fieldControlClass` / `FormErrorSummary`
        - `PageShell` / `PageHeader` / `Breadcrumb`
        - `apiFetch`, whose `ApiError.body` carries `details.fieldErrors`, mapped back onto fields
- **History.** Today only GDPR deletion writes `History`, with the convention `tableName` = `@@map` name, `fieldName` = Prisma field and `recordId`. The detail page's history card already renders such rows and maps labels via `detail-labels.ts`.
- **Duplicates.** The sheet import computes `duplicateKey(lastName, firstName, email)` (`src/lib/sheet-import/mapping.ts`) and sets `duplicateFlag`. Anonymization and merge recompute flags per key with the rule "flagged ⇔ count(key) > 1".
- **Data model.** `Applicant.updatedAt` is `@updatedAt`, so every write bumps it. This change needs no schema change.

## Goals / Non-Goals

**Goals:**

- One validation definition shared by the form and the endpoint.
- An atomic save: field update, History rows and duplicate-flag upkeep commit together or not at all.
- No lost updates between concurrent editors.
- No personal data in logs or error responses.

**Non-Goals:**

- Editing applications (program, status, form answers).
- A generic History-writing mechanism for every model, such as a Prisma extension. The update service writes its own rows; generalising waits for a second writer.
- Autosave, drafts, and route-change interception of unsaved changes inside the app. Only `beforeunload` is used.

## Decisions

### 1. Shared schema in `src/lib/applicants/edit-schema.ts` (client-safe)

- **Form schema.** `applicantEditSchema` is a Zod object of the editable fields:
    - Strings are trimmed.
    - `birthYear` stays a string in the form and is coerced and range-checked; the range's upper bound is computed at validation time.
    - `newsletter` is a boolean.
    - Messages are Hungarian, reusing `REQUIRED_MESSAGE` from the events schema.
- **Conversion.** `toApplicantUpdate(values)` turns form values into the DB shape: empty optional strings become `null` and `birthYear` becomes a number or `null`.
- **Request schema.** The endpoint validates `applicantEditRequestSchema = applicantEditSchema.extend({ expectedUpdatedAt: z.iso.datetime() })`.
- **Why one schema:** the project convention ("always validate on the server too") and identical messages on both sides. The server re-parses everything and never trusts client-side conversion.

### 2. Edit page = Server Component + one Client form

`src/app/(admin)/applicants/[id]/edit/page.tsx` runs these steps:

1. Await `params`.
2. Call `requireAdmin('/applicants/{id}/edit')`.
3. Load with a new `getApplicantForEdit(id)` in `detail.ts`, a `cache()`d `findFirst({ id, deletedAt: null })` with a `select` of the editable fields plus `updatedAt`.
4. Call `notFound()` on `null`. A `not-found.tsx` in the segment re-exports the detail segment's 404 page.

The page passes `initialValues` (as form strings) and `updatedAt` (ISO) to `ApplicantEditForm`, a Client Component. The form uses `PageShell`, `Breadcrumb` and `PageHeader`, the latter with a "Mégse" link to the detail page.

- **Why not reuse `getApplicantDetail`:** it loads applications and history, which the form doesn't need, and we keep the client payload to the editable fields.

### 3. Dirty tracking and the save bar

- **Change count.** The count comes from `formState.dirtyFields`, with `defaultValues` as the loaded values. The bar renders only when the count is above 0.
- **Discard.** "Elvetés" calls `reset(initialValues)`.
- **Leaving the page.** A `beforeunload` listener is registered while the form is dirty and not submitting.
- **Count semantics.** React Hook Form compares against the defaults, so typing a value back to the original clears it from the count, as intended.

### 4. Endpoint `POST /api/applicants/[id]/edit`

Mirrors `api/applicants/delete/route.ts`:

- **Session.** `getAdminSession()` → `401`. It also requires `session.user.id`.
- **Body.** It parses the JSON body. Malformed JSON or a schema failure → `400 { error: "Invalid request body", details: formatValidationErrors(...) }`.
- **Update.** It calls `updateApplicant(db, id, data, expectedUpdatedAt, userId)`, which maps:
    - `ApplicantNotFoundError` → `404`
    - `ApplicantConflictError` → `409 { error: "Conflict" }`
    - anything else → `500` with no details
- **Success.** `200 { updatedAt }`, `Cache-Control: no-store`. It logs `{ event: "applicant.updated", userId, changed }`, where `changed` is the number of changed fields.

POST is used rather than PATCH, to match the user-specified `/edit` path and the existing `POST /api/applicants/delete` style. The body always carries the full editable field set, which makes the diff explicit on the server.

### 5. Update service `src/lib/applicants/update.ts` (server-only)

One `db.$transaction(async (tx) => …)`:

1. **Read.** `findFirst({ id, deletedAt: null })`, selecting editable fields, `duplicateKey` and `updatedAt`. If missing → `ApplicantNotFoundError`. If `updatedAt.getTime() !== expectedUpdatedAt.getTime()` → `ApplicantConflictError`.
2. **Diff.** A pure `diffApplicant(current, next)` lists changed fields with stringified old and new values: `null` stays `null`, numbers become strings, booleans become `"true"`/`"false"`. No change at all → return `{ updatedAt: current.updatedAt, changed: 0 }` without writing.
3. **Write.** `updateMany({ where: { id, deletedAt: null, updatedAt: current.updatedAt }, data: { ...changes, duplicateKey?, updatedById } })`.
    - A `count` of 0 → `ApplicantConflictError`. This compare-and-set closes the race between step 1 and step 3 without row locks.
    - It then reads back `updatedAt`.
4. **History.** `history.createMany` with one row per changed field: `tableName: "applicant"`, `fieldName`, `recordId`, old and new values, `createdById` = the actor.
5. **Duplicates.** If `lastName`, `firstName` or `email` changed:
    - Compute `newKey = duplicateKey(...)`. The e-mail is required, so a key always exists.
    - Store `newKey` in the step 3 update.
    - For each distinct key in {old key, new key} (old key skipped if null), set `duplicateFlag = count({ duplicateKey: key, deletedAt: null }) > 1` for all applicants with that key. This is the rule used by `anonymize.ts`.

`duplicateKey` is imported from `src/lib/sheet-import/mapping.ts`, so both paths always produce identical keys. If importing that module pulls in server-only dependencies, `duplicateKey` moves to `src/lib/applicants/duplicate-key.ts` and `mapping.ts` re-exports it.

### 6. Client save flow

- **Submit.** `handleSubmit` posts `{ ...values, expectedUpdatedAt }` through `apiFetch`.
- **Success.** `toast.success("Az adatlap mentve.")`, then `router.push('/applicants/{id}')` and `router.refresh()`.
- **`400` with field errors.** They map onto fields via `setError`. Server key names equal form field names, so no alias map is needed.
- **`409`.** An inline alert with the conflict text and an "Újratöltés" button that runs `window.location.reload()`.
- **`401`.** `apiFetch` already redirects.
- **Other errors.** `toast.error("A mentés nem sikerült. Próbáld újra.")`.
- **Entered values are kept in every failure case.**

### 7. Detail page changes

- `ApplicantDetailActions` renders "Szerkesztés" as `<Button asChild><Link href=…/edit>`, while "Visszaigazolás küldése" stays disabled.
- `historyValue` maps `newsletter` values `"true"`/`"false"` to "Igen"/"Nem".
- The page already re-reads on navigation (`dynamic` server render), so the new values and history show after saving.

## Risks / Trade-offs

- **[Trade-off] E-mail is now required.** Imported applicants without an e-mail cannot be saved until one is entered. This was the user's choice. The form shows the empty required field with its error on first submit.
- **[Risk] Personal data in History values.** History values carry old and new personal data. → GDPR anonymization already scrubs `oldValue`/`newValue` for `applicant` rows, so deletion stays complete. A test asserts that the edit's History rows use `tableName: "applicant"` so the scrub matches.
- **[Risk] `updatedAt` precision.** Postgres `timestamp(3)` holds millisecond precision and round-trips through ISO strings exactly. The comparison uses `getTime()`.
- **[Trade-off] `beforeunload` only.** In-app link clicks (sidebar, breadcrumb) do not warn about unsaved changes. Intercepting App Router navigation is not supported cleanly. Acceptable for now.
- **[Risk] Duplicate recomputation cost.** It costs at most two keys × (count + updateMany) per save. Negligible.

## Migration Plan

No schema or data migration. Deploy as a normal release; rollback = revert. History rows written by edits remain valid data after a rollback.
