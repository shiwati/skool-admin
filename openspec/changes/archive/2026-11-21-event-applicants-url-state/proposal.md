# Proposal

## Why

The program's Jelentkezők tab (`/events/<id>/applicants`) keeps its status filter, sort and page only in component state. Reloading the page, returning from an applicant's detail page or sharing a link always lands on the default view. Because the server cannot know which view is open, it can only preload the default view, and after a bulk status change or a sheet sync the list is queried twice. The global Jelentkezők list already keeps its view in the URL; this tab should work the same way.

## What Changes

- The tab's status filter, sort, order, page and page size are written to the URL (`status`, `sort`, `order`, `page`, `pageSize`). Default values are left out of the URL. Invalid values silently fall back to the default. Opening such a URL restores the same view.
- Sort keys use the global list's names: `name`, `age`, `status`, `receivedAt`. Sorting by "Kor" orders by age, as on the global list: ascending is youngest first. Today ascending means birth year ascending, which is oldest first, although the label reads "kor, növekvő".
- Changing the status filter, sort or page size returns to page 1 and clears the selection (unchanged).
- The server preloads the view the URL describes, not only the default view. After a bulk status change or a sheet sync, the refreshed server data is the only reload; the client no longer fetches the list again.
- In the overview's "Jelentkezők státusz szerint" card, each status with at least one application links to the Jelentkezők tab filtered to that status.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `event-overview`: new requirements for the Jelentkezők tab view living in the URL (with age sorting by age) and for status links in the status breakdown.

## Impact

- Code: `src/components/events/overview/applications-section.tsx`, `applications-table.tsx`, `status-breakdown.tsx`, `src/app/(admin)/events/[id]/(overview)/applicants/page.tsx`, `src/lib/events/applications.ts`, a new pure URL-state module in `src/lib/events/`, `src/lib/events/links.ts`.
- API: none. `GET /api/events/[id]/applicants` keeps its parameters; the URL keys map to them.
- Docs: `docs/frontend.md` (tab description) and `docs/gaps-and-decisions.md` (the double-reload quirk goes away; decision log entry).
