## Why

GDPR deletion anonymizes applicants instead of hard-deleting them precisely so that program statistics survive. Today the dashboard, the event report's participant count and the feedback response rate still exclude anonymized applicants, so every GDPR deletion silently shrinks historical figures.

## What Changes

- Dashboard (Áttekintés): every metric (applications KPI, oversubscription, capacity chart, status breakdown, trend, demographics) counts applications of anonymized applicants too.
- Event report: the participant (ATTENDED) count includes anonymized applicants.
- Visszajelzések: the response rate's ATTENDED denominator includes anonymized applicants.
- People lists, applicant detail, search and duplicate detection keep hiding anonymized applicants (unchanged).
- Merged duplicates need no handling: their applications move to the kept applicant, so they count once.
- Docs record the decision: "statisztikák az anonimizált jelentkezőket is számolják".

## Capabilities

### New Capabilities

- `dashboard`: the admin dashboard at `/` (KPIs, period and program selection, capacity and trend charts, demographics, satisfaction, empty states), including that anonymized applicants count in its statistics.

### Modified Capabilities

- `event-report`: adds that the report's participant count includes anonymized applicants.

## Impact

- Code: `src/lib/dashboard/load.ts`, `src/lib/reports/load.ts`, `src/lib/feedback/list.ts` and their tests.
- Docs: `docs/data-and-db.md`, `docs/frontend.md`, `docs/gaps-and-decisions.md`.
- No schema, API or migration change.
