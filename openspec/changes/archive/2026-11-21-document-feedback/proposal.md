## Why

Visszajelzések (anonymous feedback synced from Google Sheets) already ships in code but has no spec. This change backfills the `feedback` spec so it matches current behavior; there is no behavior change.

## What Changes

- Document the feedback sync endpoint (`POST /api/events/<id>/feedback/sync`): which sheets are read, idempotent resync, required columns, error codes.
- Document how a response is stored: role, answers (including per-event custom questions), overall score, recommendation, anonymity.
- Document the `/feedback` list and the program tab `/events/<id>/feedback`: filters in the URL, KPIs, details drawer, empty states, admin-only access.
- No code changes.

## Capabilities

### New Capabilities

- `feedback`: syncing participant and mentor feedback forms per event and browsing them anonymously with summary statistics.

### Modified Capabilities

None. How the sheet columns are mapped and edited belongs to the `sheet-mapping` capability (separate change); quotes and metrics in the closing report belong to `event-report`.

## Impact

- Docs only: `openspec/specs/feedback/spec.md` after archive.
- Described code: `src/app/api/events/[id]/feedback/sync/route.ts`, `src/lib/feedback/*`, `src/components/feedback/*`, `src/app/(admin)/feedback/page.tsx`, `src/app/(admin)/events/[id]/(overview)/feedback/page.tsx`, `Feedback` model in `prisma/schema.prisma`.
