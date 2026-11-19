# Proposal

## Why

The applicant detail page (board 04.1) is read-only, and its "Szerkesztés" button is disabled. Staff have to correct applicant data, for example a mistyped phone number, a missing e-mail address or a changed parent contact, but today that is only possible in the database. Design board 04.2 "Adatlap szerkesztése (validáció)" covers this. The design also expects every saved change to be traceable: who changed which field, when, and from what to what.

## What Changes

- **New edit page** at `/applicants/{id}/edit`, inside the admin shell. It is pre-filled on the server from the database by the applicant id and follows board 04.2:
    - a breadcrumb "Jelentkezők › {név} › Szerkesztés"
    - the title "Adatlap szerkesztése"
    - an error summary banner with links to the invalid fields
    - a "Személyes adatok" card with vezetéknév, keresztnév, születési év, e-mail, telefon, iskola and település
    - a "Szülő / gondviselő" card with név (vezetéknév, keresztnév), anyja neve, cím, e-mail, telefon and the hírlevél checkbox
    - side cards "Mit naplózunk?" and "Automatikus mezők"
    - a floating save bar "N nem mentett módosítás" with "Elvetés" and "Mentés"
- **Validation**, on the client and again on the server:
    - Last name, first name and e-mail are required.
    - E-mail addresses (the applicant's and the parent's) must be well-formed.
    - The birth year must be in a plausible range.
    - The phone number must be in an acceptable format.
- **New endpoint `POST /api/applicants/{id}/edit`.** The form calls it on save with the filled-in data and the modification time it was loaded with. It:
    - updates the applicant
    - writes one `History` row per field that actually changed (old → new, who, when)
    - recomputes the duplicate key and duplicate flags when the name or e-mail changes
    - runs all of the above in one transaction
    - answers `409` when the applicant was modified since the form was loaded, `404` for unknown or deleted applicants, and `400` with per-field errors
- **Detail page.** The "Szerkesztés" button becomes active and links to the edit page. The change-history card shows the new entries, with "Igen"/"Nem" for the newsletter flag.
- **Left out:**
    - The board's "Jelentkezés" card (program and status editing), which belongs to the future program screen.
    - Fields that do not exist in the data model: exact birth date, gender, grade, county, settlement type, disadvantaged status.
    - The "Alumni" automatic field in the side card is described, not edited.
    - E-mail duplicate checking beyond re-flagging possible duplicates.

## Capabilities

### New Capabilities

- `applicant-editing`: editing an applicant's personal and parent data at `/applicants/{id}/edit`. Covers server-side pre-filling, the form and its validation, the save bar, the save endpoint and its error handling, change logging to History, duplicate-key upkeep, and conflict detection.

### Modified Capabilities

- `applicant-detail`: the "Szerkesztés" header action becomes enabled and leads to the edit page. Newsletter history values are shown as "Igen"/"Nem".

## Impact

- **New code:**
    - `src/app/(admin)/applicants/[id]/edit/page.tsx`
    - `src/app/api/applicants/[id]/edit/route.ts`
    - a shared Zod schema in `src/lib/applicants/edit-schema.ts`, used by client and server
    - an update service in `src/lib/applicants/update.ts`
    - an edit form Client Component under `src/components/applicants/edit/`
- **Reused:**
    - `PageShell`, `PageHeader`, `Breadcrumb`
    - `FormField`, `FormErrorSummary`, `useZodForm`, `apiFetch`/`ApiError`
    - `duplicateKey()` from the sheet import
- **Changed:**
    - `ApplicantDetailActions`, which enables "Szerkesztés"
    - `detail-labels.ts`, which renders newsletter values
    - docs: `docs/api.md`, `docs/frontend.md`, `docs/data-and-db.md` (the History section, now that editing writes entries)
- **No schema change and no migration.**
- **Behaviour change.** Applicants imported without an e-mail can only be saved once an e-mail is entered.
