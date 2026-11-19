# Design

## Context

Already built, but not committed:

- **Column:** `event.tags TEXT[] DEFAULT '{}'` (migration `20261119185534_add_event_tags`).
- **Filter:** `?tags=` on `GET /api/events`. It uses `hasSome` and the new `repeatedList` helper, which reads repeated parameters only.
- **Options endpoint:** `GET /api/events/tags`. It currently reads the distinct values from the database.
- **Seed:** `tags` is accepted as any string array.

What has to change is where the valid tags come from. See proposal.md, Why.

The UI already has a pattern for multi-value filters: `FilterChip` (a Radix Popover) holding a checkbox list. The "Program" chip in `src/components/applicants/applicants-toolbar.tsx` uses it. The "Programok" list screen does not exist yet.

## Goals / Non-Goals

**Goals:**

- One definition of the tag list that the API, the seed and the UI all import.
- A tag filter component that works on its own, so the future program list screen only has to wire it to its URL state.

**Non-Goals:**

- Normalising tags on write. There is no write path besides the seed, and the seed is already limited to the fixed list.
- Server-side search for options. This includes a `?q=` parameter on `/api/events/tags`.

## Decisions

### The tag list is a constant in a shared, client-safe module

The list lives in `src/lib/events/tags.ts` as `export const EVENT_TAGS = [...] as const`, together with a `type EventTag` and an `isEventTag` guard. The module has no `server-only` import and no Prisma import, so Client Components can use it as well. The Zod rule is `z.enum(EVENT_TAGS)`. The query schema and the seed schema both use it.

- _Alternative: a `Tag` table._ Rejected by product decision. It would also mean a migration, joins and admin screens for something a developer edits a few times a year.
- _Alternative: an environment variable._ Rejected. Tags are domain data, not deployment configuration, and every environment must have the same list.

### Validation in the application only, with no database constraint

A `CHECK (tags <@ ARRAY[...])` constraint would turn every change to the list into a migration. It would also block removing a tag while old events still have it. The only paths that write tags are the seed and, later, the import and write endpoints. All of them validate with the same Zod enum. Accepted risk: a manual SQL edit could store an unknown tag. Such a tag still comes back in event responses, but it cannot be used as a filter.

### Unknown filter tags return 400 instead of being ignored

This matches how enum query parameters already behave, for example `status` on `/api/events/[id]/applicants`. The UI can only send listed tags. A 400 therefore points to a stale client or a hand-written URL, and failing loudly is better than silently returning an unfiltered list. The `repeatedList(z.enum(EVENT_TAGS))` rule does this as part of the existing `handleQuery` validation.

### The options endpoint returns the constant, sorted

`GET /api/events/tags` stays, and now returns `EVENT_TAGS` sorted with `Intl.Collator("hu")`. The UI then has a single place to get its options. The list can later come from the database or the Sheet import without any UI change. It no longer reads the database, so its test only checks the sorting and the authentication.

- _Alternative: the client imports `EVENT_TAGS` directly._ This is simpler, but it would tie the UI to the fixed-list decision. Rejected by the product owner.
- _Alternative: keep reading the distinct database values._ Rejected. Tags that no event uses yet could never be selected.

### Type-to-search runs in the browser

The component fetches the options once, when it mounts or when it first opens. Filtering then runs locally on every keystroke. Matching compares strings normalised with `toLocaleLowerCase("hu")` and NFD normalisation with combining marks removed, and it is a substring match. The list is small, a few dozen items at most, so this is instant and there are no out-of-order responses to handle.

- _Alternative: server-side `?q=`._ This adds debouncing, loading states and request races, and gains nothing at this list size.

### Component: `FilterChip` + a combobox list

The new component is `TagFilter`, in `src/components/events/tag-filter.tsx`. It reuses `FilterChip` for the trigger, the active value and the clear button. Its popover holds:

- a text input with `role="combobox"`, `aria-expanded` and `aria-controls`
- a `role="listbox"` with `aria-multiselectable`, whose options use `role="option"` and `aria-selected`

The arrow keys move the active option through `aria-activedescendant`, and Enter toggles it, so focus stays in the input. "Nincs találat" is shown when nothing matches. The component is controlled (`selected: string[]`, `onChange`) and knows nothing about URLs, so the future program list screen owns its own URL state, like the applicants screen does.

- _Alternative: add `cmdk` through shadcn `Command`._ Rejected. It adds a dependency for one component that a small hand-written listbox can cover. Revisit this if more comboboxes appear.
- _Alternative: reuse the "Program" chip's checkbox list as it is._ Rejected. It has no search input, and the spec requires type-to-search.

### Error and loading states

While the options load, the popover shows a skeleton. If the request fails, it shows an inline error ("A címkék nem tölthetők be") with a retry button. A `401` response redirects to `/login` with the current URL, the same way the applicants screen does.

## Risks / Trade-offs

- **[A tag is removed from `EVENT_TAGS` while events still have it]** → Those events keep the value: it is returned but cannot be filtered on. Before removing a tag, clean up the data with a migration or a script. Note this in `docs/domain.md`.
- **[The filter is case-sensitive]** → Not a problem, because both the stored values and the filter values come from the same constant. Matching only needs to be lenient while typing.
- **[The component has no screen to live on yet]** → It is covered by component tests, and the program list change wires it in.

## Migration Plan

- No new migration. `20261119185534_add_event_tags` stays as it is.
- The existing seed sample has no tags, so `db:seed` keeps working. Add a few tags to `sample.json` to exercise the filter locally.
- Rollback: revert the code. The column is harmless if it stays.

## Open Questions

- The actual tag values in `EVENT_TAGS`. Until the product owner provides them, start with a placeholder list (for example `robotika`, `programozás`, `kezdő`, `haladó`). Changing the values does not affect the specs, the approach or the tasks.
