# Proposal

## Why

Duplicate review (banner, review dialog, merge, "not a duplicate") is fully built but has no spec, and the `applicant-list` spec still describes a disabled placeholder banner. The merge endpoint also has gaps: it accepts applicants that are anonymized or that do not share a duplicate key, and the merged applicant's own History rows are left pointing at a record that no longer exists.

The team decided that merging keeps the **hard delete**: the goal is that the two records become one applicant everywhere (lists, statistics), and re-imports are already prevented by the application's `sourceKey`, which moves with the application. This is an intentional exception to the "applicants are never hard-deleted" rule, which applies to GDPR deletion only.

## What Changes

- New `applicant-duplicates` capability documenting detection, the banner, the review dialog, merge and dismissal.
- Merge accepts only non-deleted applicants that all share the same non-null duplicate key; otherwise `404` (missing/deleted) or `409` (not duplicates), matching the dismiss endpoint.
- Merge moves the merged applicants' `History` rows (`tableName = "applicant"`) to the kept applicant, so the full change history is shown on one record and no History row points at a deleted applicant.
- The "Duplicate-check placeholder banner" requirement in `applicant-list` is replaced by a reference to the live banner.
- Docs: the merge exception is recorded in `CLAUDE.md` and `docs/gaps-and-decisions.md`.

## Capabilities

### New Capabilities

- `applicant-duplicates`: detecting possible duplicate applicants, reviewing them pair by pair, merging them into one applicant or dismissing the pair.

### Modified Capabilities

- `applicant-list`: the placeholder duplicate banner requirement is removed; the banner is now owned by `applicant-duplicates`.

## Impact

- `src/app/api/applicants/merge/route.ts` (+ `route.test.ts`)
- `src/lib/sheet-import/import.test.ts` (re-sync after merge)
- `CLAUDE.md`, `docs/gaps-and-decisions.md`, `docs/domain.md`
- No schema migration, no API shape change for valid requests.
