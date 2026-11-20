# Design

## Context

- **What writes history today.** `History` rows carry `tableName` (`applicant`, `application`, `event`), `recordId`, `fieldName`, old/new values as strings, and an optional `createdById`. They are written by:
    - applicant anonymization (`deletedAt`)
    - duplicate merge and dismissal
    - program edits (`PATCH /api/events/[id]`, via `diffEvent`)

    Program values are serialized: dates as ISO strings, string arrays as JSON, numbers as strings.

- **What reads history today.**
    - `getApplicantDetail` queried applicant and application history inline (20 rows).
    - The program page's `getEventOverview` (`src/lib/events/overview.ts`) reads the latest 5 `event` rows for its "Legutóbbi változások" card.
- **Ids.** Applicants and events both use cuid ids, so one id cannot name both.
- **Program page.** `/events/<id>` comes from `add-event-overview`, not yet archived. It shows a disabled "Változástörténet" tab and a "Legutóbbi változások" card (5 rows). Program field labels and value formatting already live in `src/lib/events/history-labels.ts`. That file also covers `feedbackSheetUrl` and the age range, and deliberately leaves capacity unformatted.

## Goals / Non-Goals

**Goals:**

- One history query shared by the detail card and the full page.
- One URL shape, `/history/<id>`, for both kinds of record, as requested.

**Non-Goals:**

- A paginated or filterable history API.
- A global change log across records.

## Decisions

1. **One route, type found by lookup.** `getHistorySubject(id)` (`src/lib/history/queries.ts`, `server-only`, `React.cache`) checks for a non-deleted applicant first, then for an event. It returns `{ kind: "applicant", id, name, applications: [{ id, programName }] }`, `{ kind: "event", id, name }`, or `null`.
    - Alternatives considered: `/history/<kind>/<id>` or `?type=`. They would make the type explicit, but the requested URL is `/history/<id>`, and cuids don't collide.
    - Trade-off: a program id costs one extra (empty) applicant query.
    - Applicant first, filtered by `deletedAt: null`, so an anonymized applicant's history is never shown.

2. **Shared entries query.** `getHistoryEntries(subject, limit)` builds the `where` from the subject:
    - for an event: `tableName: "event"` with its id
    - for an applicant: an `OR` of the applicant row and its application ids, the same as before

    It orders by `createdAt desc, id desc` and maps each row to `HistoryEntry`. The mapping puts the program name on application rows. `getApplicantDetail` now calls it with `HISTORY_PREVIEW_LIMIT = 5`, and the page calls it with `HISTORY_PAGE_LIMIT = 200`. The old `HISTORY_LIMIT` is removed, and `ApplicantHistoryEntry` stays as an alias of `HistoryEntry`.

3. **Hard cap instead of pagination.** One record's history is small today: only a few writers exist. A 200-row cap keeps the page a single server render. The count line above the entries says when the cap is hit.
    - Alternative considered: cursor pagination. That is deferred until real volumes require it.

4. **Labels come from where the preview cards take them.** Applicant and application fields use `historyFieldLabel` and `historyValue` (`src/lib/applicants/detail-labels.ts`). Program fields use `eventHistoryFieldLabel` and `eventHistoryValue` (`src/lib/events/history-labels.ts`). The shared entry components (§6) pick the pair by subject `kind`.
    - Alternative considered: adding the program labels to `detail-labels.ts` (the first draft of this change). It was dropped after rebasing onto `add-event-overview`: it duplicated the program labels and drifted from them (no `feedbackSheetUrl`, no age-range format, a "fő" unit the program page doesn't use).

5. **Day grouping as a pure helper.** `src/lib/history/group.ts` (client-safe):
    - `groupByDay` groups consecutive entries by their Budapest `ÉÉÉÉ-HH-NN` key.
    - `formatDayLabel` returns "Ma", "Tegnap", or `hu-HU` long date.
    - `formatTime` returns the time of day.

    The input is already sorted, so consecutive grouping is enough. "Tegnap" is now minus 24 h. Around a DST switch, a change made in the first or last hour of the day can get a long-date heading instead of "Tegnap". This is acceptable.

6. **Shared entry rendering.** `src/components/history/history-change.tsx` exports `HistoryChangeSummary` ("<actor> módosította: <mező> (program)") and `HistoryChangeDiff` ("régi → új"). Both take a `kind` of `"applicant"` or `"event"`. The applicant detail card and the page use them. The program page's own `EventHistoryCard` is left as `add-event-overview` built it, apart from the new link. The page adds an initials avatar, colored per actor with the existing deterministic `programColorClass` hash.

7. **Page structure.** `src/app/(admin)/history/[id]/page.tsx` follows the applicant detail page:
    - `load()` calls `requireAdmin("/history/<id>")` before reading data, because layouts and pages render concurrently.
    - `generateMetadata` sets "<név> · Változástörténet".
    - A local `not-found.tsx` handles unknown ids.
    - One `HistoryHeader` for both kinds: the breadcrumb (list › name › Változástörténet, with the name linking to `/applicants/<id>` or `eventHref(id)`) and an `h1`. The subject already carries the name, so no extra query is needed.
    - `historyHref(id)` (`src/lib/history/href.ts`, client-safe) builds every link to the page.

8. **One entry point per record: "Teljes napló".** The applicant card and the program page's `EventHistoryCard` both get a "Teljes napló" link (`EventHistoryCard` gains an `eventId` prop). The program page's disabled "Változástörténet" tab is removed, so programs and applicants work the same way.
    - Alternative considered: enabling the tab and rendering the program header and tabs on `/history/<id>`. That was tried and dropped at review: programs and applicants would then behave differently, and the program header would be rendered in two places.
    - Alternative considered: a "Változástörténet" item in the programs list row menu (the first draft). It was dropped once the program page existed.

## Risks / Trade-offs

- [The id lookup order hides an event whose id equals a live applicant's] → cuids make this practically impossible. The page would still show the applicant, never the wrong person's data from a deleted record.
- [Programs with more than 200 changes show a truncated log] → the count line says so. Add pagination when needed.
- [Design 05.4 shows the log as a program tab with the program header] → this was deliberately not followed: the log is a separate page that looks the same as the applicant's. The breadcrumb leads back to the program page.
- [Program history does not include application status changes for that program] → out of scope in the proposal. The query can later add application rows filtered by `eventId`.
- [This change modifies `event-overview`, which only exists in the unarchived `add-event-overview`] → archive that change first. Archiving this one before it would be refused.
