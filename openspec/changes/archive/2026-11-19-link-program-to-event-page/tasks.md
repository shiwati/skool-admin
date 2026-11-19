# Tasks

## 1. Link the program name to the program page

- [x] 1.1 Add `eventHref(id)` (`/events/<id>`) next to `applicantsHref` in `src/components/events/events-table.tsx`, and use it for the program name link. Keep "Jelentkezők megtekintése" in the row actions on `applicantsHref`. Verified: `npx vitest run src/components/events` passes, and `events-view.test.tsx` expects `href="/events/e1"` on the name link.
- [x] 1.2 Run `npm run lint` and `npx tsc --noEmit`, and verify that both pass.

## Workflow follow-up

- `/events/<id>` shows "not found" until the program page change (board 05.3) is built.
- Archive this change after review. This replaces "Program cell" with "Program name links to the program page" in `openspec/specs/event-list/spec.md`.
