# Proposal

## Why

The Programok list (`/events`) gained behaviour without an OpenSpec change: a column picker like the Jelentkezők list, whole-row navigation, and mobile cards that follow the column settings. The `event-list` spec still describes a fixed column order, a name-only link and a fixed card layout, and it says the mobile search field takes the full width. This change brings the spec in line with what is shipped.

## What Changes

- The program table's columns become configurable (show/hide, reorder) through an "Oszlopok" picker; "Program" is always visible and the default order is unchanged.
- Column settings are saved in the browser, separately from the Jelentkezők list's settings.
- On phones the picker is a 44 px icon button next to the search field and only controls visibility; the cards keep the order set on a larger screen.
- Clicking anywhere on a program row (or tapping anywhere on a program card) opens the program page, except on the row actions menu. The name stays a real link.
- Mobile program cards show one labelled line per visible column, in the configured order; "Státusz" becomes one of those lines.
- The mobile search field shares its row with the column picker button instead of taking the full width.

No behaviour changes in code: the implementation already exists. This is a spec sync.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-list`: configurable table columns and column picker, persisted column settings, whole-row navigation, mobile cards following the column settings, mobile search row.

## Impact

- Specs only: `openspec/specs/event-list/spec.md` after archive.
- Already implemented in `src/components/events/` (`events-table.tsx`, `event-columns.tsx`, `events-toolbar.tsx`, `events-view.tsx`), the shared column picker and settings, and the shared row navigation helper.
