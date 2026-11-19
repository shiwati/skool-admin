# Proposal

## Why

The applicant detail page and the program page (`/events/<id>`) each show only the latest changes of their record in a side card. Admins need a full change log for one applicant or program (design boards "05.4 Program · Változástörténet" and "04.1 Jelentkező adatlap"). Both should open it the same way.

## What Changes

- New admin page `/history/<id>` shows the full change history of one applicant **or** one program. The page decides which one by the id: first a non-deleted applicant, then a program. An unknown id, or a deleted applicant, shows a "not found" page.
- On the page:
    - the same header for both kinds: the breadcrumb "Jelentkezők › <név> › Változástörténet" or "Programok › <név> › Változástörténet" (the name links back to the record's page), and the name as the heading
    - the number of changes, at most the latest 200 entries
    - entries grouped by Budapest day ("Ma", "Tegnap", "2026. november 3."). Each entry shows the actor's initials, "<név> módosította: <mező>", "régi → új" and the time.
    - a "Mit naplózunk…?" side card
- Field labels and values are shown the same way as on the card that previews them. Applicant fields use the applicant detail labels, and program fields use the program page labels (`src/lib/events/history-labels.ts`), so the labels are not duplicated.
- The applicant detail history card is renamed from "Változástörténet" to "Legutóbbi változások", as on the program page. It shows at most the **5** latest entries (was 20), with a "Teljes napló" link to `/history/<id>`.
- On the program page, the "Legutóbbi változások" card gains a "Teljes napló" link to `/history/<id>`, the same as the applicant card. The disabled "Változástörténet" tab is removed, so the log has one entry point, as for applicants.
- Out of scope:
    - the Felhasználó / Mező / Időszak filters of the design
    - the global change log ("Megnyitás a teljes változásnaplóban")
    - pagination beyond 200 entries
    - showing an applicant's status changes in their program's history

## Capabilities

### New Capabilities

- `change-history`: the `/history/<id>` page. It covers which record the id names, the page header, what entries it lists and how, and how fields and values are labelled.

### Modified Capabilities

- `applicant-detail`: the "Change history card" requirement renames the card to "Legutóbbi változások", changes from 20 entries to 5, and gains the "Teljes napló" link.
- `event-overview`: "Program header and tabs" drops the "Változástörténet" tab, and "Latest changes" gains the "Teljes napló" link. This capability is introduced by the in-flight change `add-event-overview`, so that change must be archived before this one.

## Impact

- **Code:**
    - new `src/app/(admin)/history/[id]/` (page and not-found)
    - new `src/lib/history/` (`queries.ts`, `group.ts`, `href.ts`)
    - new `src/components/history/history-change.tsx`
    - `src/lib/applicants/detail.ts` now uses the shared history query
    - also changed: `src/components/applicants/detail/history-card.tsx`, `src/components/events/overview/event-history-card.tsx`, `src/components/events/overview/event-tabs.tsx`, `src/app/(admin)/events/[id]/(overview)/page.tsx`, and the tests next to them
- **API, data:** no new endpoint, no schema change or migration. The page reads the existing `History` table on the server.
- **Archive order:** archive `add-event-overview` first.
