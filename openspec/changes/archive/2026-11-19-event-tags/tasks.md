# Tasks

## 1. Data model (done before this change was written)

- [x] 1.1 Add `tags String[] @default([])` to `Event` and the migration `20261119185534_add_event_tags`. Verified: the migration applied locally and `npm run typecheck` passes.
- [x] 1.2 Add the `repeatedList` query helper to `src/lib/api/query.ts`: repeated parameters only, no comma splitting, deduplicated, blank values dropped. Verified: `?tags=` tests in `src/app/api/events/route.test.ts`.
- [x] 1.3 Add the `hasSome` tag filter to `GET /api/events`. Verified: the "filters by tags (any match)" test passes.

## 2. Fixed tag vocabulary

- [x] 2.1 Create `src/lib/events/tags.ts`. It exports `EVENT_TAGS` (placeholder values: `robotika`, `programozás`, `kezdő`, `haladó`), the `EventTag` type, `isEventTag` and an `eventTagSchema` Zod enum, and imports neither `server-only` nor Prisma. Verify with a colocated unit test for `isEventTag` and the enum.
- [x] 2.2 Validate seed tags with `eventTagSchema` in `src/lib/seed-data-schema.ts`. Verify with tests in `seed-data-schema.test.ts`: an unknown tag fails, known tags pass, and a missing `tags` becomes `[]`.
- [x] 2.3 Add a few tags to some events in `prisma/seed-data/sample.json`. Verify that `npm run db:seed:reset` succeeds locally.
- [x] 2.4 Update `docs/domain.md`: tags come from the fixed list in `src/lib/events/tags.ts`, changing the list is a code change, and the data must be cleaned up before a tag is removed. Verify by reading the doc against the design.

## 3. API alignment

- [x] 3.1 Change the `tags` rule in `GET /api/events` to `repeatedList(eventTagSchema)`, replacing the free-text rule with the 100-character limit. Verify with route tests: listed tags filter with `hasSome`, an unknown tag gives `400` and no DB call, and the overlong-tag test is replaced.
- [x] 3.2 Make `GET /api/events/tags` return `EVENT_TAGS` sorted with `Intl.Collator("hu")`, without reading the database. Verify with route tests: `401` without a session, every tag in Hungarian order, `Cache-Control: no-store`, and no DB mock needed.
- [x] 3.3 Update `docs/api.md` for both endpoints: the fixed list, `400` for an unknown tag, the endpoint returns the list rather than database values. Verify by reading the doc against the spec.

## 4. Tag multiselect filter component

- [x] 4.1 Add `src/components/events/tag-filter.tsx`. It is a controlled `TagFilter` (`selected`, `onChange`) built on `FilterChip` and fetches `GET /api/events/tags` once when first opened. Verify with a component test: the options are fetched once and the active value shows the selected tags.
- [x] 4.2 Add type-to-search: case-insensitive, accents ignored, substring match, filtered locally, and "Nincs találat" with no create option. Verify with component tests: `elm` matches `Élmény`, typing makes no extra fetch, and an unknown text shows no create option.
- [x] 4.3 Add combobox/listbox ARIA and keyboard operation: arrow keys plus `aria-activedescendant`, Enter toggles, focus stays in the input. Clearing goes through the chip's clear button. Verify with component tests using `@testing-library/user-event`.
- [x] 4.4 Add the loading skeleton, the inline error with retry, and the redirect to `/login?callbackUrl=…` on `401`. Verify with component tests that mock `fetch`.

## 5. Integration check

- [x] 5.1 Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run format:check`; verify that all pass.
- [x] 5.2 With the local DB seeded and `npm run dev` running, check `/api/events?tags=robotika` and `/api/events/tags` while signed in. Verify that the filtered events and the sorted fixed list come back, and that an unknown tag gives `400`.

## Workflow follow-up

- Replace the placeholder values in `EVENT_TAGS` once the product owner provides the real list.
- Wire `TagFilter` into the "Programok" list screen when that change is made, with the tags kept in the URL as `?tags=a&tags=b`.
- Archive the change after review.
