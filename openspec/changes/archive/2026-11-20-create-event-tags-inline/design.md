# Design

## Context

- Tags are stored as `Event.tags String[]` (Postgres text array). The allowed values come from `EVENT_TAGS` in `src/lib/events/tags.ts`, enforced by `eventTagSchema` (a `z.enum`) in the create/edit schemas, the list query parameters, the seed schema and `toEventFormValues` (which silently drops tags outside the list when the edit form loads).
- `GET /api/events/tags` returns the sorted fixed list as `{ items: string[] }`; the list filter (`TagFilter`) loads it once per opening and narrows it in the browser.
- The program form uses `OptionChips` (pick only) for tags. `TagInput` (free text chips, used for mentors) has no suggestions.
- Tag colours are a fixed map (`TAG_CLASSES`), with a grey fallback.

See proposal.md for the motivation and the specs for the required behaviour.

## Goals / Non-Goals

**Goals:**

- One normalization function shared by the browser and the server, so a tag typed in the form and a tag sent straight to the API end up identical.
- No schema migration; existing data keeps working.

**Non-Goals:**

- A tag table, tag management screen, renaming or merging.
- Adding tags outside the program form (program page header, list rows).
- Applicant tags.

## Decisions

### Vocabulary derived from the data

The options are computed from the events: `SELECT tag, count(*) FROM event, unnest(tags) AS tag GROUP BY tag`, via a parameterless `$queryRaw` in a small query function (`src/lib/events/tags.ts` or a server-only sibling). Sorting by count, then Hungarian collation, happens in TypeScript with the existing `Intl.Collator("hu")`.

- Alternative: a `Tag` table with a join table. Rejected: it only pays off with rename/merge, which needs the management screen we are avoiding, and it leaves orphan rows to clean up.
- Alternative: `findMany({ select: { tags: true } })` and counting in Node. Works, but loads every event; `unnest` keeps it to one row per tag.

### Shared normalization

`normalizeTag(value: string): string` (trim, collapse `\s+` to one space, `toLocaleLowerCase("hu")`) and `tagSchema` (`z.string().transform(normalizeTag).pipe(z.string().min(1).max(30).refine(no comma))`) replace `eventTagSchema`. Arrays are de-duplicated after normalization. The same schema serves the form, the create/edit endpoints, the list query parameters (where an invalid value keeps returning `400`) and the seed. `isEventTag`/`EventTag` go away; tags become plain `string`.

`toEventFormValues` stops filtering tags, so editing a program never drops a tag.

### Near-duplicate key

The match key for "is this an existing tag?" reuses `searchKey` from `tag-filter.tsx` (NFD, strip combining marks, Hungarian lowercase), moved next to `normalizeTag` so both the filter and the form import it from one place. When the key of the typed text equals the key of an option, the option is offered and "+ Új címke" is hidden. The server does not merge near-duplicates (it only normalizes): the protection is a UI guard, which is enough without bulk imports of tags.

### Creatable tag field

A new client component (e.g. `src/components/form/tag-combobox.tsx`) replaces `OptionChips` for tags: selected tags as removable chips, a text input with a listbox (ARIA combobox pattern, same keyboard behaviour as `TagFilter`: arrows, Enter, Escape, Backspace on empty input removes the last chip). Options are loaded once from `GET /api/events/tags` when the field is first focused, then filtered in the browser. The last option, "+ Új címke: „<normalized text>”", appears only when the text is valid and has no near-duplicate.

- Alternative: extend `TagInput` with suggestions. Rejected: `TagInput` commits on comma/blur, which would create tags by accident; mentors keep using it unchanged.

### Endpoint shape

`GET /api/events/tags` returns `{ items: { name, count }[] }`. `TagFilter` is updated to read `name` (it may show the count as a hint). There are no other consumers.

### Colours

`tagClass(tag)` keeps `TAG_CLASSES` for the four existing tags; for any other tag it picks from a palette array (the same background tokens as today, excluding grey) by a small string hash (e.g. FNV-1a or a char-code sum mod length) of the normalized tag. Deterministic, no storage, same on server and client.

## Risks / Trade-offs

- [Typos become permanent until fixed by hand on each program] → near-duplicate guard in the form; renaming is a possible later change.
- [Hash colours can collide or look similar] → acceptable for a handful of tags; the four main tags keep fixed colours.
- [Breaking response shape of `GET /api/events/tags`] → only `TagFilter` uses it; updated in the same change.
- [Filter URLs with tags that no longer exist] → they return an empty list instead of `400`, and the filter chip still shows the value so it can be cleared.
- [Existing data outside the new rules (e.g. uppercase)] → normalization runs on save; the four existing tags already comply. No data migration needed.
