# Tasks

> Implemented in the working tree after rebasing onto `origin/develop`, which brought in the program page (`add-event-overview`). All groups are done; 6.1 was checked in the browser by the user.

## 1. Labels and value formatting

- [x] 1.1 Reuse the existing labels instead of adding new ones (design §4): applicant fields from `src/lib/applicants/detail-labels.ts`, program fields from `src/lib/events/history-labels.ts`. `detail-labels.ts` is unchanged by this change.

    Verify: `git diff origin/develop -- src/lib/applicants/detail-labels.ts src/lib/events/history-labels.ts` is empty, and the history page test "shows program fields with the program form's labels" passes ("Mentorok", "— → Szűcs Petra, Kiss Ádám").

- [x] 1.2 Add `src/lib/history/group.ts` with `formatTime`, `formatDayLabel` ("Ma" / "Tegnap" / `hu-HU` long date) and `groupByDay`, all in Europe/Budapest (design §5).

    Verify: `group.test.ts` covers today, a 23:30 UTC entry that already counts as "Ma", "Tegnap", "2026. november 3.", the time "10:12", and the grouping order.

- [x] 1.3 Add `historyHref(id)` in `src/lib/history/href.ts` (client-safe, URL-encoded).

    Verify: the card test expects `/history/a%201` for the id `a 1`.

## 2. Shared history queries

- [x] 2.1 Add `src/lib/history/queries.ts` (`server-only`), per design §1–2:
    - `getHistorySubject`: a non-deleted applicant first, then an event, otherwise `null`; wrapped in `React.cache`.
    - `getHistoryEntries(subject, limit)`.
    - The limit constants `HISTORY_PREVIEW_LIMIT = 5` and `HISTORY_PAGE_LIMIT = 200`.

    Verify: `queries.test.ts` (node environment, mocked `@/lib/db`) covers four cases:
    - Applicant resolution with `deletedAt: null`, and no event query.
    - The event fallback.
    - `null`.
    - The event `where`, `take` and order, and the applicant `OR` with program names mapped onto entries.

- [x] 2.2 Switch `getApplicantDetail` to `getHistoryEntries(…, HISTORY_PREVIEW_LIMIT)` and remove `HISTORY_LIMIT`; keep `ApplicantHistoryEntry` as an alias.

    Verify: `detail.test.ts` expects `take: 5` and still passes the actor and program name mapping.

## 3. Applicant detail card

- [x] 3.1 Add `HistoryChangeSummary` and `HistoryChangeDiff` in `src/components/history/history-change.tsx`, with a `kind` prop that picks the label pair (design §4, §6). Rebuild `HistoryCard` on them with `kind="applicant"`, the title "Legutóbbi változások" (as on the program page), a required `applicantId`, and a "Teljes napló" link in the card header. Pass `applicantId` from `src/app/(admin)/applicants/[id]/page.tsx`.

    Verify: `detail-sections.test.tsx` covers four cases:
    - the existing status-change scenario
    - the "Rendszer" scenario
    - the empty-state scenario
    - the new "Teljes napló" link

## 4. History page and program entry points

- [x] 4.1 Add `src/app/(admin)/history/[id]/page.tsx` (design §7):
    - `requireAdmin` before any read
    - one header for both kinds: breadcrumb (list › name › Változástörténet; the name links to the record's page) and `h1`
    - the count line ("N változás" / "A legutóbbi 200 változás"), hidden when there are no entries
    - day-grouped timeline with initials avatar and time
    - empty state
    - "Mit naplózunk…?" side card
    - `generateMetadata` title "<név> · Változástörténet"

    Also add `not-found.tsx` ("Nem található ilyen változásnapló", with links to both lists).

    Verify: `page.test.tsx` covers six cases:
    - The session is checked before reading, with the return URL `/history/a1`.
    - An unknown id gives not-found with no entries read.
    - An applicant: breadcrumb, name link, day heading, entry texts, "Rendszer" and "2 változás".
    - A program: the same header ("Programok › … › Változástörténet", links to `/events` and `/events/e1`), no program tab bar, empty state without a count, and side card title.
    - Program field labels.
    - The metadata title.

- [x] 4.2 Remove the disabled "Változástörténet" tab from `EventTabs`. Add `eventId` and a "Teljes napló" link to `EventHistoryCard`, and pass `eventId` from the program overview page (design §8).

    Verify:
    - `event-tabs.test.tsx`: no "Változástörténet" tab, and the disabled tabs are "Visszajelzések" and "Záró riport".
    - The program overview page test: the "Teljes napló" link points to `/history/e1`.

## 5. Documentation

- [x] 5.1 Update the Hungarian knowledge base:
    - `docs/frontend.md`:
        - the `/history/[id]` route, its header per subject kind, and its entry points
        - the applicant card (latest 5, "Teljes napló")
        - the program page's card link, and the removed tab
    - `docs/domain.md` and `docs/data-and-db.md`: the current History writers and readers

    Verify: `grep -rn "legfrissebb 20\|semmi nem tölti\|sor-menüjének" docs` returns nothing.

## 6. Integration check

- [x] 6.1 With `npm run dev` and seeded data, check four things:
    - `/applicants/<id>` shows at most 5 entries, and "Teljes napló" opens `/history/<id>`.
    - After editing a program, its page's "Legutóbbi változások" shows the change, and there is no "Változástörténet" tab. "Teljes napló" opens `/history/<id>`, which looks the same as an applicant's: breadcrumb "Programok › … › Változástörténet", the name, and the change under "Ma".
    - `/history/unknown` shows the not-found page.
    - Signed out, `/history/<id>` redirects to `/login?callbackUrl=…` (checked with curl: 307 to `/login?callbackUrl=%2Fhistory%2Fabc`).

    Verify: the first three are observed in the browser, signed in.

- [x] 6.2 Run `npm run lint`, `npm run typecheck` and `npm test`, and check that all pass.

## Workflow follow-up

- Archive `add-event-overview` first. This change modifies its `event-overview` capability.
- Then archive this change (`openspec-archive-change`). That syncs `change-history`, and the `applicant-detail` and `event-overview` deltas, into `openspec/specs/`.
