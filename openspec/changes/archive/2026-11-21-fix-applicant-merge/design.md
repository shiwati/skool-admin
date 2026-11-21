# Design

## Context

Merge runs in one transaction in `src/app/api/applicants/merge/route.ts`: it loads the applicants, moves applications, writes `merged_from` History rows, deletes the merged applicants with `deleteMany`, then recomputes `duplicateFlag` per key. `DuplicateDismissal` rows cascade on delete. History has no foreign key (`tableName` + `recordId`), so rows of a deleted applicant stay but point at nothing; `/history/<id>` then 404s.

Anonymization clears `duplicateKey` (`anonymizedApplicantData`), so deleted applicants never share a key with anyone. That makes the missing `deletedAt: null` filters in the flag recount (merge, anonymize, sheet import) harmless in practice.

## Goals / Non-Goals

**Goals:** reject non-duplicates and deleted applicants; keep History consistent; spec what exists.

**Non-Goals:** soft-deleting merged applicants (decided against: see proposal); a `mergedIntoId` redirect; changing the dialog UI; a shared write-endpoint helper.

## Decisions

- **Keep the hard delete.** Soft delete would leave a hidden row with no applications and no visible effect; re-import protection already comes from `Application.sourceKey` (`@@unique([eventId, sourceKey])`), which moves with the application. Alternative (anonymize + `deletedAt` + `mergedIntoId`) adds a migration and filter for no user-visible gain.
- **Validate inside the transaction**: load with `deletedAt: null`; if fewer rows than ids → `NotFoundError` (404); if any key is null or keys differ → new `NotDuplicateError` (409). Same semantics as the dismiss endpoint.
- **Re-point History**: `tx.history.updateMany({ where: { tableName: "applicant", recordId: { in: mergeIds } }, data: { recordId: primaryId } })`, executed before writing the new `merged_from` rows. Application-level History rows are keyed by application id and need no change.
- **Recount filter**: add `deletedAt: null` to the merge recount for clarity and future safety; leave the import and anonymize recounts as they are (keys are null on deleted rows), noted here rather than changed.

## Risks / Trade-offs

- [Merged history is mixed into the kept applicant's timeline] → intended: they are the same person; the `merged_from` row marks the point of the merge.
- [Hard delete is irreversible] → the review dialog already asks the admin to pick the kept record; the `merged_from` row keeps the merged id for audit.
