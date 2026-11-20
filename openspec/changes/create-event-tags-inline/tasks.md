# Tasks

## 1. Tag rules (shared)

- [x] 1.1 In `src/lib/events/tags.ts` replace `EVENT_TAGS`/`eventTagSchema`/`isEventTag` with `normalizeTag`, `tagSchema` (1–30 chars, no comma) and a de-duplicating `tagListSchema`; move `searchKey` there from `tag-filter.tsx`. Verify with unit tests for trimming, whitespace collapsing, Hungarian lowercasing, length, comma and duplicates.
- [x] 1.2 Switch every user of the old schema to the new one: create/edit schemas (`schema.ts`, `api-schema.ts`), list query params (`list.ts`, `list-params.ts`) and `seed-data-schema.ts`; make `toEventFormValues` keep all tags. Verify `npm run typecheck` and the existing schema/list-params/seed tests (updated: unused tag → accepted, malformed → rejected, `"  Robotika "` + `"robotika"` → `["robotika"]`).

## 2. Tag options endpoint

- [x] 2.1 Add a server-only query returning `{ name, count }` for tags in use (`unnest` + `GROUP BY`), sorted by count then Hungarian order, and use it in `GET /api/events/tags`. Verify with a route test (mocked `db`): order, counts, `no-store`, `401` without session.
- [x] 2.2 Update `TagFilter` to the `{ name, count }` items. Verify the tag filter tests still pass (type-to-search, keyboard, no create option) with the new response.
- [x] 2.3 Update `docs/api.md` for the new response shape and the unused-tag filter behaviour; verify the documented example matches the route test.

## 3. Tag field in the program form

- [x] 3.1 Build the creatable tag field (chips + combobox: suggestions most used first, case/accent-insensitive narrowing, "+ Új címke: „…”" only for valid text without a near-duplicate, keyboard: arrows/Enter/Escape/Backspace). Verify with component tests for the spec scenarios "Picking an existing tag", "Adding a new tag" and "Missing accent".
- [x] 3.2 Replace `OptionChips` with it in `event-form.tsx` (new and edit). Verify the event form tests: a new tag is submitted normalized, a server field error on "Címkék" is shown on the field.

## 4. Colours

- [x] 4.1 Make `tagClass` return the fixed colour for the four existing tags and a hash-chosen palette colour for any other tag. Verify with unit tests: fixed tags unchanged, same tag → same class, unknown tags are never grey.

## 5. Docs and integration

- [x] 5.1 Update `docs/frontend.md` (program form tags, tag colours) and the domain notes that mention the fixed tag list (`docs/`). Verify no doc still says tags come from a fixed list (`grep -ri "fix címke\|fixed tag" docs`).
- [x] 5.2 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`; then in the browser create a program with a new tag, check it appears in the list filter, and remove it again to see it disappear.

## Workflow follow-up

- After archive, update the `## Purpose` of `openspec/specs/event-tags/spec.md`: it still says tags come from a fixed, developer-maintained list.
