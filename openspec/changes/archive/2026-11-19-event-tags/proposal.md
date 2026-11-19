# Proposal

## Why

Staff need to group programs by theme, for example robotics, programming or beginner level, and then filter the program list by those groups. `Event` has no field for this. A first backend version was built outside OpenSpec: a `tags` column, a `?tags=` filter on `GET /api/events` and `GET /api/events/tags`. It treats tags as free text taken from the database. The product decision is different: for now tags come from a **fixed list maintained by developers**, and nobody can add a new tag from the UI. This change records the agreed behaviour and brings the existing code in line with it.

## What Changes

- `Event` gets a `tags` field: a list of strings, empty by default. The column and its migration (`20261119185534_add_event_tags`) already exist.
- A single fixed tag list (`EVENT_TAGS`) in a shared module is the only source of valid tags. Changing the list is a code change; it needs no migration.
- `GET /api/events?tags=a&tags=b` returns events that have **at least one** of the given tags. Tags are passed only as repeated parameters and are not split on commas. A tag that is not in the fixed list is rejected with `400`.
- `GET /api/events/tags` returns the fixed list in Hungarian alphabetical order, no longer the distinct values found in the database. The endpoint stays so the UI is not affected if the list later becomes dynamic, for example from the Google Sheet import.
- The seed accepts only tags from the fixed list, so no other value can reach the database.
- A tag multiselect filter component. It follows the existing filter-chip pattern (`FilterChip`, like "Program" on the applicants screen) and adds a text input. While the user types, the options are filtered in the browser: case-insensitive, ignoring accents, with no request per keystroke. It offers only the listed tags; creating a new tag is not possible.
- Out of scope:
    - adding, renaming or removing tags from the UI
    - editing an event's tags (there is no event write endpoint yet)
    - the "Programok" list screen itself, which is still disabled in the sidebar; the multiselect is built to drop into it
    - a database-level constraint on tag values

## Capabilities

### New Capabilities

- `event-tags`: tags on events. Covers the fixed tag vocabulary, storing tags on an event, filtering events by tag, the tag options endpoint, and the tag multiselect filter.

### Modified Capabilities

None.

## Impact

- **Data:** `event.tags TEXT[] DEFAULT '{}'`, already migrated. No further migration.
- **API:**
    - `GET /api/events` gets the new `tags` parameter, validated against the fixed list.
    - `GET /api/events/tags` changes from returning database values to returning the fixed list.
    - Both endpoints are still unreleased, so nobody depends on the old behaviour.
- **Code:**
    - new `EVENT_TAGS` module, importable from server and client
    - `src/app/api/events/route.ts`
    - `src/app/api/events/tags/route.ts`
    - `src/lib/api/query.ts` (`repeatedList`)
    - `src/lib/seed-data-schema.ts`
    - new client component next to `FilterChip`
- **Docs:** `docs/api.md` and `docs/domain.md`. Both were already updated for the database-derived version and need to be rewritten for the fixed list.
- **Open input needed:** the actual tag values for the fixed list.
