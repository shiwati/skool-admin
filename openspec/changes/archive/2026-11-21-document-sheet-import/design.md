## Context

Spec backfill for existing code; no implementation work. The applicant sync and the mapping editor share the Google Sheets helpers (`src/lib/google/*`) and the matching logic in `src/lib/sheet-import/mapping.ts`.

## Goals / Non-Goals

**Goals:** describe observed behavior of the sync and mapping features as two capabilities.

**Non-Goals:** changing behavior; re-specifying the program page sync card (owned by `event-overview`); specifying the feedback import itself beyond how its mapping is stored.

## Decisions

- Split into `applicant-sheet-import` (the import contract) and `sheet-mapping` (headers, matching, stored mappings), because mappings also serve the feedback sheets.
- The duplicate rule is specified as "another non-deleted applicant with the same key"; a separate change aligns the code (`deletedAt: null` in the duplicate count).

## Risks / Trade-offs

- [Spec and code disagree on the duplicate count until the separate fix lands] → the verification task notes it.
