# Design

## Context

The `/events` screen and the `phase`/`place` parameters are already built but not committed (see proposal.md, Why). This document records the technical decisions behind them, so a reviewer can check them alongside the spec.

The starting points were:

- **`Event` has no status field.** It has `from`, `to`, `sheetUrl` (the Google Form response sheet) and `capacity`.
- **`GET /api/events` already existed.** It handled filters, sorting and pagination, and returned `applicationCounts` per status.
- **The applicants screen sets the pattern for list screens.** Its list state lives in the URL, and it uses the `FilterChip`, `SearchField`, `Pager` and `TagFilter` components. It loads its first page on the server, then fetches on the client through `/api/applicants`.

## Goals / Non-Goals

**Goals:**

- One query implementation shared by `GET /api/events` and the page.
- Server-rendered list data. No client fetch layer for this screen.
- A phase and status that the server filter and the row badge always agree on.

**Non-Goals:**

- A stored event status, a registration deadline, or a registration-open flag.
- Moving the shared list components out of `components/applicants`.
- Client-side caching of results or prefetching between tabs.

## Decisions

### Phase and status are derived, not stored

The phase is computed from `to`, `from` and `sheetUrl`, at the moment of the request:

- `to < now` → closed
- otherwise, `sheetUrl` set → active
- otherwise → planned

The row status adds two more checks: whether the event is running, and whether its applications have reached its capacity. The rules are in the spec under "Event phase" and "Event display status".

The phase rule exists twice:

- as a Prisma `where` fragment (`phaseWhere`), used for filtering and counting;
- as a pure function (`eventStatus`), used for the badge.

Both live in `src/lib/events/`, and unit tests pin down their boundaries.

- _Alternative: a `status` column._ Rejected for now. No product decision defines its states or who sets them, and this change only specifies what is already built. A later change can add the column, and `event-list` would then be modified.
- _Alternative: `Tervezett` means "starts in the future", whether or not there is a sheet._ Rejected. It would overlap with active events whose registration is open. The design's tab counts (9 + 6 + 9 = 24) show that the phases do not overlap.

### Shared server-only query module

`src/lib/events/list.ts` holds `eventsQuerySchema`, `listEvents` and `countEventsByPhase`. The route handler parses the query and calls `listEvents`. The page builds the same query input from its URL state, parses it with the same schema to apply defaults, and calls the same functions directly. Nothing differs between what the page shows and what the API returns for the same parameters.

- _Alternative: the page calls its own API with `fetch`._ Rejected. It would add a network hop inside the server and duplicate the auth handling.

### Server rendering, with the URL as the only state

The page is a Server Component that reads `searchParams`, queries the data and passes plain props to one Client Component (`EventsView`). Every interaction rewrites the URL with `router.replace(…, { scroll: false })` inside `startTransition`. The server then renders the new result. While the transition is pending, the table is dimmed and marked `aria-busy`.

URL parsing and serialisation are in `src/lib/events/list-params.ts`:

- parsing is lenient: invalid values fall back to their defaults;
- default values are left out of the URL;
- any change other than the page resets it to 1.

- _Alternative: copy the applicants approach (`useApplicants` with client fetch and a server-loaded first page)._ Rejected for this screen. The program list is small and has no selection or bulk actions that need client-held data. Server rendering avoids a second data path and the loading and error states that come with it.
- **Trade-off:** there is no skeleton while a new URL loads, only the dimmed table. A database error goes to the app's error boundary instead of an inline "Újratöltés" state.

### One "now" per request

The server takes `now` once. It uses that value for the phase filters and the counts, and passes it to the view as an ISO string. The badge status and the date formatting use the same value. A row can therefore never show a status that contradicts the tab it is listed under, even when an event starts or ends during the request.

### Tab counts are three counts; "Összes" is their sum

`countEventsByPhase` runs one `count` per phase. Each count applies every filter except the phase. "Összes" is the sum of the three, which is correct because the phases do not overlap.

This means four count queries per render, the three phase counts plus the total of the visible page, along with `findMany` and one `groupBy` for the applications. That is acceptable for the expected volume of hundreds of events.

- _Alternative: one `groupBy` on a computed phase._ Prisma cannot group by an expression. Raw SQL would split the filter logic in two.

### Reuse of the applicants list components

The page imports `FilterChip`, `SearchField`, `TextChip` and `Pager` from `components/applicants`, and `TagFilter` from `components/events`. Two small changes made them reusable:

- `Pager` takes an `itemLabel` prop, with `"jelentkező"` as the default;
- `SearchField` takes `label` and `placeholder` props.

The applicants screen behaves exactly as before.

- _Alternative: move them to `components/list` now._ Postponed. A move would touch many applicants files and tests in a change that only specifies existing behaviour. A follow-up can do it when a third list screen needs them.

### Program links point to the filtered applicants list

The program name and the "Jelentkezők megtekintése" menu item open `/applicants?eventIds=<id>`. The design's per-program page (05.3) does not exist yet. This reuses an existing screen and filter, and the link target can change later without any data change.

## Risks / Trade-offs

- **[Risk] `sheetUrl` stands in for "registration open".** A program that has a sheet but has closed registration still counts as "Aktív" and shows "Jelentkezés nyitva". → This is called out in proposal.md for review. An explicit field would be a follow-up change to `event-list`.
- **[Risk] Demand counts every application, rejected ones included.** This can overstate oversubscription. → It matches the spec, and the rule sits in one place (`applicationCounts.total`). Excluding statuses later is a one-line change, plus a spec change.
- **[Risk] A running event without a sheet is "Tervezett" in the tabs but "Folyamatban" in its badge.** → This is rare, because events normally get a sheet before they start. The spec documents both rules. It would go away with a stored status.
- **[Trade-off] The year filter uses the Budapest calendar year of the start date.** A program that crosses New Year counts in the year it starts.
- **[Trade-off] Every interaction is a server round trip.** That is fine on the admin network. If it feels slow, the tab counts are the first thing to cache.

## Migration Plan

No database migration. The new API parameters are optional and additive, so existing callers are not affected. The seed adds sample events for every phase, and it only affects local databases. To roll back, revert the commit. Nothing is stored that depends on this change.
