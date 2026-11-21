# Design

## Context

`ApplicationsSection` holds the view as `useState<ApplicationsQuery>` and fetches every view from `GET /api/events/<id>/applicants`. The page (`(overview)/applicants/page.tsx`) preloads only `DEFAULT_APPLICATIONS_QUERY` and passes it as `initial`. After a bulk status change or a sheet sync the section both bumps its own `attempt` (client refetch) and calls `router.refresh()` (needed for the tab and chip counts), so the server also reruns the preload. The global list (`src/lib/applicants/list-params.ts`, `ApplicantsView`) already solves the same problem: a pure parse/serialize module, URL written with `window.history.replaceState`, server preloading the URL's view.

## Goals / Non-Goals

**Goals:**

- One source of truth for the view: the URL.
- The server renders whatever view the URL describes; client fetches only on view changes.
- After a mutation, exactly one list reload.

**Non-Goals:**

- No change to `GET /api/events/<id>/applicants` or its parameters.
- No multi-status filter on the tab (still one status chip at a time).
- Selection is not put in the URL.

## Decisions

**Pure URL-state module.** `src/lib/events/applications-params.ts` exports `parseApplicationsParams(URLSearchParams) → ApplicationsView`, `toApplicationsSearchParams(view)` (omits defaults) and `toApplicationsApiQuery(view)` (maps `name → lastName`, `age → birthYear` with inverted order, `status`, `receivedAt` unchanged). Invalid values use zod `.catch(default)`, as `list-params.ts` does. Same shape as the global list's module, so both lists read alike; testable without React. Alternative considered: keep API sort keys in the URL. Rejected because it would differ from the global list and keep the "kor, növekvő" = oldest-first mismatch.

**Writing the URL with `window.history.replaceState`.** Next syncs `useSearchParams` without a server round trip, as on the global list. `router.replace` would rerender the page on the server for each click and query twice. `replace` rather than `push` keeps the global list's behavior (no history entry per filter click).

**Server preloads the URL's view; the client keys data by query.** The page reads `searchParams`, parses them, calls `loadEventApplicationsPage(id, apiQuery)` and passes `{ query, data }` as `initial`. The section keeps the existing `settled` keyed by `attempt:queryString` and skips the fetch when the key already has data.

**Mutations rely on `router.refresh()` only.** After a bulk status change or a sheet sync the section no longer bumps `attempt`. `router.refresh()` reruns the page, which now preloads the open view. The section adopts a new `initial` prop when it differs from the one it last saw (the "adjust state on prop change" pattern), so the refreshed data replaces the list without a client fetch. The "Újratöltés" button after a load error still bumps `attempt` and fetches from the client. Alternative considered: keep the client refetch and skip the server preload on refresh. Rejected: the server cannot tell a refresh from a first load, and the counts must come from the server anyway.

**Status links in the breakdown.** `eventApplicantsHref(id, { status })` builds the URL through `toApplicationsSearchParams`, so the link and the tab parse the same format. Only statuses with a count above 0 are links.

## Risks / Trade-offs

- [`router.refresh()` is slower than a direct fetch, so the list updates a moment after the toast.] → The bulk bar already shows a pending state; acceptable for an admin tool.
- [Changed "Kor" sort direction surprises users used to oldest-first.] → The label now matches the order; recorded in the decision log.
- [Back/forward navigation restores the router cache's tree, whose `initial` may answer an older query.] → The query-keyed `settled` state ignores data for another query and fetches.
