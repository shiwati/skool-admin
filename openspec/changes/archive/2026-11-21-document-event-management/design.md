# Design

## Context

The specs are being backfilled from the code: `src/lib/events/api-schema.ts`, `src/app/api/events/**`, `src/lib/reports/save.ts`, `src/lib/google/*`, `src/components/events/**`. The plan doc `docs/plans/report-google-doc-template.md` described the switch from HTML upload to a template copy, which the code already completed.

## Goals / Non-Goals

**Goals:**

- Specs describe what the code does today, including API status codes.
- Record that `REPORT_TEMPLATE_DOC_ID` is required.

**Non-Goals:**

- Changing behavior. Gaps found while writing (e.g. the missing route tests) become tasks.
- The participant-count requirement of `event-report` (handled by another change that counts anonymized applicants).

## Decisions

- **Server capacity rule is the spec rule.** The API accepts `capacity >= 0` (0 = no limit, the default on create); the form requires at least 1 ("Legalább 1 fő legyen."). The spec states the API rule and mentions the stricter form rule, because other clients (imports, scripts) go through the API.
- **No HTML fallback for report generation.** `REPORT_TEMPLATE_DOC_ID` is validated at startup; without it the app does not start. Alternative (generate from HTML when unset) was rejected: two code paths, and the HTML output never matched the partner template.
- **Not-found page**: `event-overview` already requires the not-found page for an unknown id; only its content is added, as a new requirement, so the existing one is untouched.
- **CSV export lives in `event-list`**: `src/lib/events/export.ts` exports the Programok list, not a program's applicants. There is no applicant CSV export on the program's Jelentkezők tab.

## Risks / Trade-offs

- [Specs encode accidental behavior] → Where code and intent might differ (form vs API capacity), the design names it so a later change can align them.
