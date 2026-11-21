# Tasks

## 1. URL state module

- [x] 1.1 Add `src/lib/events/applications-params.ts` (view type with sort keys `name`|`age`|`status`|`receivedAt`, defaults, `parseApplicationsParams`, `toApplicationsSearchParams` omitting defaults, `toApplicationsApiQuery` mapping `age` to `birthYear` with inverted order); verify with `applications-params.test.ts` covering round trip, defaults omitted, invalid values falling back, and the age inversion
- [x] 1.2 Let `eventApplicantsHref(id, view?)` in `src/lib/events/links.ts` append the serialized view; verify with a links test (`?status=WAITLISTED`, no query for the default view)

## 2. Jelentkezők tab reads and writes the URL

- [x] 2.1 Switch `ApplicationsSection` and `ApplicationsTable` to the URL view: read with `useSearchParams`, write with `window.history.replaceState`, keep "Rendezés: …" and "Alapsorrend" working with the new keys; verify with updated `applications-section.test.tsx` (chip writes `status`, page reset, default view gives a clean URL, "kor, növekvő" = youngest first)
- [x] 2.2 Page preloads the URL's view: parse `searchParams` in `(overview)/applicants/page.tsx` and pass `{ query, data }` as `initial`; the section skips the fetch for that query; verify with `page.test.tsx` (preload called with the parsed query) and a section test (no fetch for the preloaded query)
- [x] 2.3 Mutations reload only via `router.refresh()`: drop the `attempt` bump after bulk status change and sheet sync, adopt a changed `initial` prop; verify with section tests (no client list fetch after a status change; new `initial` replaces the rows) and that "Újratöltés" after an error still fetches
- [x] 2.4 Update `docs/frontend.md` (tab state in the URL) and `docs/gaps-and-decisions.md` (remove the double-reload quirk, add a decision-log row incl. the "Kor" direction); verify `npm run format:check` passes

## 3. Status links in the breakdown

- [x] 3.1 Make each status with a count above 0 in `status-breakdown.tsx` a link to `eventApplicantsHref(id, { status })`; verify with `status-breakdown.test.tsx` (link for a non-zero status, plain text for zero)

## 4. Integration checks

- [x] 4.1 Run `npm run lint`, `npm run typecheck`, `npm test` and `openspec validate --all --strict`; all pass
- [x] 4.2 In the running app, open a filtered tab URL, reload, go to an applicant and back, and run a bulk status change; the view is kept and the list is fetched once per change (Network tab)

## Workflow follow-up

- Archive the change (`openspec-archive-change`) after review, which merges the delta into `openspec/specs/event-overview/spec.md`.
