# Tasks

## 1. Database: extension, folded columns, triggers

- [x] 1.1 Create the migration (`npm run db:migrate -- --name accent_insensitive_search`), hand-editing the SQL. It must:
    - create the `unaccent` extension;
    - add the nullable columns `applicant.search_text`, `applicant.hometown_search`, `event.name_search`, `event.location_search`, `event.company_search` and `event.instructor_search`;
    - add `BEFORE INSERT OR UPDATE` trigger functions and triggers on `applicant`, `event` and `feedback` (the feedback one folds `search_text` in place);
    - backfill the existing rows.

    Add the matching optional fields to `schema.prisma`.

    Verify:
    - `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` passes after `db:deploy`;
    - on the local dev database (with seed data) `SELECT count(*) FROM applicant WHERE search_text IS NULL` is 0 after the migration;
    - a manual `UPDATE applicant SET last_name = 'Kovács'` refreshes `search_text` to contain `kovacs`.

- [x] 1.2 Document the folded columns, the triggers and the rule "never recreate these tables without the triggers" in `docs/data-and-db.md` (migration list and a short "Keresés" section). Verify: `npm run format:check` passes.

## 2. Query helpers

- [x] 2.1 Add `foldSearch(db, texts)` to `src/lib/api/query.ts`: one `SELECT lower(unaccent(t)) … unnest($1::text[]) WITH ORDINALITY` round trip, which returns the folded strings in input order and skips the query for an empty list. Also add `foldedContains(folded)` (`{ contains }`). Verify: unit tests with a mocked `db.$queryRaw`: order kept, no query for an empty list, and `%`/`_` passed through as literal text, because Prisma's `contains` escapes them.

## 3. Use the folded columns in every text filter

- [x] 3.1 Jelentkezők (`src/lib/applicants/list.ts`): `q` words match `searchText` and `hometown` matches `hometownSearch`, both folded with one `foldSearch` call. Verify: `src/app/api/applicants/route.test.ts` asserts the new `where` shape with a mocked fold, and that no fold query runs without text filters.
- [x] 3.2 Program Jelentkezők tab (`src/lib/events/applications-list.ts`): `q` words match `applicant.searchText`. Verify: `src/app/api/events/[id]/applicants/route.test.ts` asserts the `where` shape (the route runs the `q` branch end to end).
- [x] 3.3 Programok (`src/lib/events/list.ts`): `q` words match `nameSearch`, `place` matches `locationSearch` OR `companySearch`, `companyName` matches `companySearch`, and `instructor` matches `instructorSearch`, in one fold call. The tab counts use the same conditions. Verify: `src/app/api/events/route.test.ts` assertions are updated.
- [x] 3.4 Visszajelzések (`src/lib/feedback/list.ts`): fold `q` with the same helper and keep the whole-phrase match on `searchText`. Verify: `src/lib/feedback/list.test.ts` is updated.
- [x] 3.5 Docs: `docs/api.md` notes that the text parameters (`q`, `hometown`, `place`, `companyName`, `instructor`, and the feedback search) ignore case and accents; `docs/gaps-and-decisions.md` gets a decision-log row (database-side folding with triggers, and why not JavaScript folding). Verify: `npm run format:check` passes.

## 4. E2E coverage of the scenarios

- [x] 4.1 Add a `factory.feedback({ event, answers })` helper to `e2e/support/factory.ts` that stores a response with its lowercased `search_text`, as the import does. Verify: it is used by 4.2.
- [x] 4.2 Extend `e2e/writes/filters.spec.ts` with one test per `text-search` scenario:
    - "kovacs" finds "Kovács Anna" but not "Kocsis Anna";
    - "Kovács Béla" finds the stored "Kovacs Bela";
    - the "Település" filter "pecs" finds "Pécs";
    - the Programok filters "Helyszín / partner" `gyor`, "Oktató" `peter` and "Cég" `pelda`;
    - the feedback search "elveztem a tabort" (on `/feedback`);
    - the CSV export of a "kovacs" search contains "Kovács Anna";
    - a rename through the database: the search follows the new name and drops the old one;
    - an anonymized "Kovács" is no longer found.

    Verify: the new tests pass with `npx playwright test e2e/writes/filters.spec.ts` (writes project) at the Verification step below. Do not run E2E per task.

## 5. Verification

- [x] 5.1 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` and `openspec validate --all --strict`; all pass.
- [x] 5.2 Run `npm run test:e2e` once, after every other task is done. The full suite passes, including the new filter tests. If local Postgres is not running, mark this task blocked and say so.
- [x] 5.3 Before merging: confirm that the production database allows `CREATE EXTENSION unaccent` (design.md, Risks). Record the answer in the PR. Answer (2026-11-22): production runs on Neon, which lists `unaccent` among its supported extensions and lets the database owner role create it.

## Workflow follow-up

- Archive the change (`openspec-archive-change`) after merge. This creates the `text-search` main spec. Before archiving, check that task 5.2 is ticked.
