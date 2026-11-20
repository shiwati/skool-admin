# Proposal

## Why

After each event, Skool sends the partner company a report (see the Bosch × Skool PDF sample): event details, people involved, quotes from feedback, and an "Impact Spotlight" with percentages. Today it is assembled by hand from the sheets. The design boards R01–R03 and ZR1–ZR6 describe an in-app flow that collects this data and produces a Google Doc, which the team then finishes and exports by hand.

## What Changes

- New page `/reports` (R03): finished events (`to` in the past) with tabs "Teendő" (no report yet), "Kész" (at least one doc generated) and "Mind". Columns: event, end date, status, last generation (who, when), action.
- New tab "Záró riport" at `/events/<id>/report` (R01, no live preview), enabling the disabled tab in the event tab bar:
    - **Alapadatok** (read-only): date and time, location, company, number of participants (`ATTENDED` applications), age range.
    - **Közreműködők**: rows of role / organisation / name, pre-filled from `Event.instructor` and `Event.mentors`, editable, rows can be added and removed.
    - **Idézetek**: free-text answers from the event's feedback (participant and mentor), anonymous. Up to 8 selected, up to 2 highlighted (★); the text can be edited (e.g. to fix typos).
    - **Impact Spotlight**: a percentage per statement, computed from feedback (share of 4–5 answers, or 1–2 for reversed statements; share of "yes" for choice questions). Each metric can be switched off. A metric without answers is shown as "nincs adat" and is never included.
    - **Mentés** and **Google Doc generálása** buttons.
- Generation creates a **new Google Doc on each run** in the signed-in admin's own Drive and records it. After it succeeds, the page shows a link and a notice that the file is in the user's own Drive. Earlier docs stay listed.
- The report is **in Hungarian**. When an English version is needed, the team uses Google Docs' built-in _Eszközök → Dokumentum lefordítása_; the app does no translation. Free text (introduction, "What did we do?", photos) is not edited in the app. The doc contains placeholder paragraphs that the team fills in Google Docs.
- Out of scope: live A4 preview, PDF generation (exported by hand from Docs), partner logos, charts, multi-event reports, machine translation.

## Document structure (fixed template)

1. **Borító**: „<companyName> × Skool workshop – záró riport”, dátum, helyszín; KPI-csempék (résztvevők, korosztály, mentorok és oktatók, „ajánlaná” %); fix „Milyen egy Skool workshop?” és „Miért jó ez?” szöveg; bevezető helyőrző.
2. **Az alkalom**: max. 2 kiemelt idézet; „Kik vettek részt?” táblázat (szerep, szervezet, név), résztvevők száma korosztállyal; „Mit csináltunk?” helyőrző.
3. **Visszajelzések és hatás**: „Mit szerettek a legjobban a lányok és a mentorok?” (kiválasztott idézetek); „★ A hatás számokban ★” (bekapcsolt mutatók, pl. „**100%** szerint a programozás izgalmas”).
4. **Fotók**: helyőrző a fotóknak és linkeknek; „★ KÖSZÖNJÜK, HOGY MINDEZ MEGVALÓSULHATOTT ★”.

The template is HTML in the repo. It is uploaded to Drive with conversion to a Google Doc, so styling (headings, colours, tables) comes from the template and no Docs API calls are needed.

## Capabilities

### New Capabilities

- `event-report`: report list, report editor tab, Google Doc generation.

### Modified Capabilities

- `event-overview`: the "Záró riport" tab is enabled and links to `/events/<id>/report`.

## Impact

- **Auth:** the Google sign-in also requests `https://www.googleapis.com/auth/drive.file` (only files the app creates). Every admin has to sign in once more. The existing `GoogleReauthRequiredError` flow covers a missing scope.
- **Env:** no new variables.
- **Data:** new `EventReport` model (one per event): `content` Json (people, selected quotes with edited text and highlight flag, disabled metric keys), `updatedAt`, `updatedById`. New `EventReportDocument` model: `eventId`, `docId`, `docUrl`, `createdAt`, `createdById`. Migration `add_event_report`. Generating a doc writes a `History` row.
- **Privacy:** no applicant names or contact data go into the report. Only counts and anonymous feedback text are used. Mentor and instructor names are included, as in the sample.
- **Code:** `src/lib/reports/` (pure aggregation, metric calculation and HTML rendering, with tests; Drive upload), Route Handlers (`/api/events/[id]/report`, `/api/events/[id]/report/documents`) that each call `getAdminSession()`, `src/app/(admin)/reports/`, `src/app/(admin)/events/[id]/(overview)/report/`, and a "Riportok" item in the sidebar.
