## Context

See proposal.md – Why. Anonymization (`src/lib/applicants/anonymize.ts`) sets `deletedAt`, clears names/contacts/free text, but keeps applications, `birthYear` and `hometown`. Merging moves the duplicate's applications to the kept applicant and hard-deletes the duplicate, so it never needs filtering in statistics.

## Goals / Non-Goals

**Goals:** every aggregate figure counts anonymized applicants' applications.

**Non-Goals:** people lists, detail, search, history and duplicate detection keep `deletedAt: null`; no schema change.

## Decisions

Rule: a query that returns **numbers** (count, groupBy, ratio, distribution) does not filter on `deletedAt`; a query that returns **people/rows** a user can open does.

Audit of `deletedAt: null` / counting queries in `src/lib` and `src/app`:

| Query                                                                                                                                | Kind                              | Decision                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard/load.ts` `activeApplicant` (applications KPI, `_count.applications` per event, status `groupBy`, demographics `findMany`) | statistic                         | remove filter, rewrite comment                                                                                                                                                               |
| `reports/load.ts` ATTENDED `count`                                                                                                   | statistic                         | remove filter                                                                                                                                                                                |
| `feedback/list.ts` "Kitöltési arány" (response rate) ATTENDED `count`                                                                | statistic                         | remove filter; no `feedback` main spec exists yet, so no delta here — the feedback spec being written in `document-feedback` must state the rule (response rate counts anonymized attendees) |
| `events/overview.ts` status `groupBy` (overview KPIs, tab count)                                                                     | statistic                         | already unfiltered – no change                                                                                                                                                               |
| `events/list.ts` status `groupBy` (event list counts)                                                                                | statistic                         | already unfiltered – no change                                                                                                                                                               |
| `applicants/list.ts` per-applicant application count                                                                                 | per-person, rows already filtered | no change                                                                                                                                                                                    |
| `applicants/list.ts`, `detail.ts`, `update.ts`, `duplicates.ts`, `history/queries.ts`, `api/applicants/duplicates/dismiss`           | people/rows                       | keep filter                                                                                                                                                                                  |
| `api/events/[id]/applicants` rows + `count` (pagination total)                                                                       | people list                       | keep filter                                                                                                                                                                                  |
| `feedback/list.ts:157`                                                                                                               | —                                 | same as response rate above                                                                                                                                                                  |

Demographics: anonymized applicants keep `birthYear` and `hometown` (not personal-identifying alone), so they contribute real values, not "Nincs adat".

## Risks / Trade-offs

- [Event overview "Jelentkezők" tab count (unfiltered) can exceed the rows its list shows (filtered)] → accepted and pre-existing; the count is a statistic.
- [Feedback response rate has no spec delta] → the `document-feedback` change should state it when written.
