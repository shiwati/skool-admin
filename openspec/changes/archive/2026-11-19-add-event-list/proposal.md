# Proposal

## Why

The programs list at `/events` was built straight from the UI design (board "05.1 Programok listája") without an OpenSpec change. It is already in the code. Several of its rules are inferred from the data model and nobody has agreed to them yet. The clearest example is how an event's phase and status are worked out: there is no status field, so the phase comes from the event's dates and from whether it has a registration sheet. This change writes down the behaviour as built, so it can be reviewed, and so later changes have a spec to modify (a real status field, export, a per-program page).

## What Changes

This change specifies existing behaviour. It does not add new behaviour.

- A programs page at `/events` with:
    - a heading
    - phase tabs with counts: Aktív, Tervezett, Lezárt, Összes
    - a search field and filter chips: Címke, Helyszín / partner, Időszak, Oktató
    - a sortable, paginated table
    - empty states
- Each event's phase and its display status are derived from:
    - its dates (`from`, `to`)
    - whether it has a registration sheet (`sheetUrl`)
    - its number of applications compared with its capacity
- Demand is shown per event: applications against capacity, an oversubscription ratio badge and a fill bar.
- The list state is kept in the URL. The server reads it to load the page.
- `GET /api/events` already accepts two parameters that the page uses:
    - `phase` (`active` | `planned` | `closed`)
    - `place`: matches the location or the partner company
- The "Programok" sidebar item now links to `/events`. Before, it was disabled.
- Out of scope. These are in the design but have no data or endpoint yet:
    - the "Riport" column
    - the "Exportálás" button
    - the "Túljelentkezés" filter
    - the column picker
    - a dedicated per-program page: for now the program name leads to the applicants list, filtered to that program

## Capabilities

### New Capabilities

- `event-list`: the programs list screen at `/events`, the phase and status rules it relies on, and the list query parameters on `GET /api/events` that it uses (`phase`, `place`).

### Modified Capabilities

- `admin-shell`: "Programok" is no longer a disabled future item. It links to `/events`.

## Impact

- **Code (already in place):**
    - `src/app/(admin)/events/page.tsx`
    - `src/components/events/events-{view,tabs,toolbar,table}.tsx`
    - `src/lib/events/{list,list-params,phase,format}.ts`
    - `src/app/api/events/route.ts` (now uses `listEvents`)
    - small shared changes in `src/components/applicants/{pager,applicants-toolbar}.tsx`
- **API:** `GET /api/events` gets the two new optional parameters, `phase` and `place`. Existing parameters are unchanged. `docs/api.md` is already updated.
- **Data:** no schema change. The seed has sample events for every phase.
- **Open question for review:** "Tervezett" (planned) is inferred from a missing `sheetUrl`. If the product needs an explicit draft or registration status, a follow-up change will modify `event-list`.
