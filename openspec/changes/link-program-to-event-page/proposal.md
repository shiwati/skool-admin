# Proposal

## Why

On the programs list, clicking a program name opens the applicants list filtered to that program. That was a stand-in until a program has its own page. The program page will live at `/events/<id>` (design board "05.3 Program · Jelentkezők"), so the list should link there now. The list then does not need another change once that page is built.

## What Changes

- In the programs list, the program name links to `/events/<id>` instead of `/applicants?eventIds=<id>`.
- Until the program page exists, the link shows the app's "not found" page. This is accepted for now.
- No other change. The row actions item "Jelentkezők megtekintése" still opens the applicants list filtered to that program.
- Out of scope: building the `/events/<id>` page itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-list`: "Program cell" is replaced by "Program name links to the program page". The requirement is removed and added again under the new name, because its scenario changes.

## Impact

- **Code:** `src/components/events/events-table.tsx` (new `eventHref`, used by the name link) and its view test.
- **API, data:** no change.
