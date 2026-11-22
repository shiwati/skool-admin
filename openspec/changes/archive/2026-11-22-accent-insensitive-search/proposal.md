# Proposal

## Why

Admins often type names and places without accents ("kovacs", "pecs"), but the list filters match accents exactly, so "kovacs" does not find "Kovács". Case is already ignored (Postgres `ILIKE`); accents are not. The E2E filter tests made this visible, and the duplicate detection already ignores accents, so search is the odd one out.

## What Changes

- Every server-side free-text list filter ignores accents as well as case, in both directions: "kovacs" finds "Kovács", and "Kovács" finds "Kovacs". This covers:
    - **Jelentkezők:** the search field (first name, last name, e-mail) and the "Település" chip (`q`, `hometown` on `GET /api/applicants`; also used by the e-mail list and the CSV export).
    - **The program's Jelentkezők tab:** the `q` parameter of `GET /api/events/<id>/applicants` (used by its e-mail list).
    - **Programok:** the search field (name) and the "Helyszín / partner", "Cég" and "Oktató" chips (`q`, `place`, `companyName`, `instructor` on `GET /api/events`; also used by the CSV export).
    - **Visszajelzések:** the text search over free-text answers.
- Matching rules stay otherwise unchanged: multi-word searches still need every word, the feedback search still matches the whole phrase, and the results and their order are the same apart from the newly matched rows.
- The database gets the Postgres `unaccent` extension and accent-folded search columns, kept up to date by the database itself (see design.md). This is backward compatible with the deployed code.

Out of scope: client-side filtering inside dropdowns (for example the program picker's own search box), sorting by accent-folded names, and search indexes. Indexes are to be revisited after go-live.

## Capabilities

### New Capabilities

- `text-search`: how the list filters match typed text (case- and accent-insensitive substring match, word by word where the filter says so), and which filters this applies to.

### Modified Capabilities

None. The existing search requirements ("ignoring case") stay true. `text-search` adds the accent rule for all of them in one place, so the list specs need no edits.

## Impact

- **Database:** a migration that:
    - creates the `unaccent` extension;
    - adds nullable folded columns on `applicant` and `event`;
    - adds trigger functions that fill those columns and fold `feedback.search_text`;
    - backfills the existing rows.

    `schema.prisma` gains the matching fields. The production database must allow `CREATE EXTENSION unaccent`; see the risks in design.md.

- **Code:**
    - `src/lib/api/query.ts`: a fold helper that runs in the database, and a folded "contains" condition;
    - `src/lib/applicants/list.ts`, `src/lib/events/list.ts`, `src/lib/events/applications-list.ts`, `src/lib/feedback/list.ts`: the filters use the folded columns.
- **Tests:** Vitest for the helpers and the query builders; E2E in `e2e/writes/filters.spec.ts` and a feedback search test.
- **Docs:**
    - `docs/api.md`: the text parameters ignore accents;
    - `docs/data-and-db.md`: the folded columns and triggers;
    - `docs/gaps-and-decisions.md`: a decision-log row.
- **APIs:** request and response shapes are unchanged.
