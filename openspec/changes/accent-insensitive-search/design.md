# Design

## Context

See proposal.md for the motivation. The current state:

- **Applicants and events:** the filters build Prisma `where` objects with `containsInsensitive(value)` (`{ contains, mode: "insensitive" }` → Postgres `ILIKE '%…%'`, with `%`/`_` escaped by Prisma):
    - `src/lib/applicants/list.ts`: `q` word by word over `firstName`/`lastName`/`email`, plus `hometown`;
    - `src/lib/events/applications-list.ts`: `q` the same way;
    - `src/lib/events/list.ts`: `q` word by word over `name`, plus `place` (`location` or `companyName`), `companyName` and `instructor`.
- **Feedback:** `src/lib/feedback/list.ts` matches the whole phrase in `feedback.search_text`. That column holds the lowercased free-text answers and is written only by the import (`src/lib/feedback/parse.ts`) and the demo seed.
- **Writes to the searched columns** happen in many places: the sheet import, applicant and event editing, the duplicate merge, the anonymization, the event form, the seed, and the E2E factory.
- **Prisma cannot call SQL functions** inside a `where`, so `unaccent(column)` cannot be expressed in the existing query builders.
- **Deployment:** migrations run in the Vercel production build and must be backward compatible with the deployed code. `migrations.yml` checks that `schema.prisma` matches the migrated database. The local and CI databases are `postgres:18`, which ships `unaccent`. The production provider is not documented in the repo.

## Goals / Non-Goals

**Goals:**

- One folding rule for both sides of the comparison: the stored text and the typed text are folded by the same Postgres function.
- Records are searchable right after any write path, without code in each path (spec: "New and changed records are searchable at once").
- The query builders keep their shape: Prisma `where` objects, with no raw SQL list queries.

**Non-Goals:**

- No search indexes (`pg_trgm`) for now: the data is small and production is not live yet. Revisit after go-live.
- No accent-insensitive sorting, and no change to client-side filtering in dropdowns.

## Decisions

### 1. Trigger-maintained folded columns

The migration adds nullable text columns that hold `lower(unaccent(…))` of the searched fields, filled by `BEFORE INSERT OR UPDATE` row triggers:

| Table       | Column                   | Content                                                   |
| ----------- | ------------------------ | --------------------------------------------------------- |
| `applicant` | `search_text`            | `first_name`, `last_name`, `email`, joined with a newline |
| `applicant` | `hometown_search`        | `hometown`                                                |
| `event`     | `name_search`            | `name`                                                    |
| `event`     | `location_search`        | `location`                                                |
| `event`     | `company_search`         | `company_name`                                            |
| `event`     | `instructor_search`      | `instructor`                                              |
| `feedback`  | `search_text` (existing) | folded in place by its trigger                            |

The newline separator keeps a word from matching across two fields; search words never contain whitespace.

`schema.prisma` declares the new columns as optional `String?` fields (`searchText`, `hometownSearch`, `nameSearch`, `locationSearch`, `companySearch`, `instructorSearch`). The app never writes them. Triggers and functions are not part of the Prisma schema, so `prisma migrate diff` does not report them.

Because the database fills the columns, every write path is covered: import, edit, merge, anonymization (the name becomes "Törölt jelentkező" and the e-mail is cleared, so the old name is no longer found), the seed, the factory, and manual SQL.

- _Alternative:_ fold in application code on every write. Rejected: about 8 write paths would each have to remember it, and a missed one would silently break search.
- _Alternative:_ Postgres generated columns. Rejected: `unaccent` is not `IMMUTABLE`, so it would need a wrapper function marked immutable, and Prisma has no support for generated columns, which risks drift in `migrate diff`.
- _Alternative:_ raw SQL that returns matching ids, then `id: { in: ids }`. Rejected: an extra query per filter, and large `IN` lists on broad searches.

### 2. The typed text is folded by the same SQL function

A helper in `src/lib/api/query.ts` folds all typed filter strings of one request in a single round trip:

```
foldSearch(db, texts) → SELECT lower(unaccent(t)) FROM unnest($1::text[]) WITH ORDINALITY
```

`foldedContains(folded)` then returns `{ contains: folded }` against the folded column. No `mode` is needed, because both sides are already lowercase. The builders call `foldSearch` only when a text filter is present. The list functions are already async.

- _Alternative:_ fold in JavaScript (`normalize("NFD")` plus stripping marks, as `duplicateKey` does). Rejected: it differs from `unaccent` for letters without a decomposition (`ł`, `ø`, `ß`), so "Łukasz" typed as is would not find the stored row.

### 3. Feedback keeps its phrase match

`feedback.search_text` is folded in place by its trigger. The query folds `q` with the same helper and keeps matching the whole phrase. `parse.ts` keeps lowercasing; the trigger does the rest.

### 4. Migration (backward compatible)

One migration:

1. `CREATE EXTENSION IF NOT EXISTS unaccent;`
2. Add the nullable columns.
3. Create the trigger functions and triggers.
4. Backfill with plain `UPDATE`s that set the folded columns from the source columns, and fold `feedback.search_text`.

The code deployed before this change ignores the new columns. Its inserts and updates still pass through the triggers, so the columns stay correct during the rollout. The app's `updatedAt` is set by Prisma, not by the database, so the backfill does not touch it. Nothing is dropped or renamed.

### 5. The folded columns stay out of responses

Queries that return whole `applicant` or `event` rows (the lists, the merge response, the program page and its edit form) pass `omit: APPLICANT_SEARCH_OMIT` / `EVENT_SEARCH_OMIT` from `src/lib/search-columns.ts`, so the API responses and props keep their shape. Components that took the Prisma `Event` type take `EventRecord` (the same type without the folded columns).

- _Alternative:_ Prisma's global `omit` client option. Rejected: the client type then no longer matches the plain `PrismaClient` that the NextAuth adapter and the internal `Db` helper types expect.

## Risks / Trade-offs

- **The production database might refuse `CREATE EXTENSION unaccent`** (the provider or role lacks the privilege). The build would then fail at `migrate deploy` and the old deployment would stay live. Mitigation: confirm with the provider before merging. Managed Postgres such as Neon and Supabase allow `unaccent`. If it is refused, fall back to JavaScript folding at write time (the rejected alternative in Decision 1) in a new change.
- **Triggers are invisible to Prisma.** A future migration that recreates these tables, or a manual `db push`, could drop them unnoticed. Mitigation: document them in `docs/data-and-db.md`. The E2E filter tests fail at once if they go missing, because the setup migrates from scratch.
- **One extra query per filtered list request** (`foldSearch`). It is a cheap `SELECT` with no table access. Acceptable.
- **Seq scans** with `LIKE '%…%'` on the folded columns. This is fine at the current data size; add `pg_trgm` GIN indexes if lists get slow.

## Migration Plan

Deploy normally: the migration runs in the production build, before promotion. Rollback means redeploying the previous build. The extra columns, triggers and extension can stay, because the old code ignores them. Removing them would be a separate migration.
