# Tasks

## 1. Data and config

- [x] 1.1 Prisma: `EventReport` (unique `eventId`, `content` Json, `updatedAt`, `updatedById`) and `EventReportDocument` (`eventId`, `docId`, `docUrl`, `createdAt`, `createdById`); migration `add_event_report`.
- [x] 1.2 Zod schema for `content` (people, quotes `{ feedbackId, questionKey, text, highlighted }`, `disabledMetrics`), max 8 quotes, max 2 highlighted.
- [x] 1.3 Add the `drive.file` scope to the Google provider; extend the token helper to require it for Drive calls.

## 2. Report logic (`src/lib/reports/`)

- [x] 2.1 `metrics.ts`: Impact Spotlight from `Feedback.answers` (4–5 share, reversed statements, "yes" share; empty → no data) with Hungarian report labels per question key; tests.
- [x] 2.2 `quotes.ts`: quote candidates from text answers of the event's feedback; tests.
- [x] 2.3 `load.ts`: report data for an event (basics, `ATTENDED` count, age range, saved content or defaults from instructor and mentors).
- [x] 2.4 `render.ts`: Hungarian HTML document from the fixed template, with escaping and placeholders; tests.
- [x] 2.5 `drive.ts`: upload HTML as a Google Doc (`files.create`, multipart, target mime `application/vnd.google-apps.document`), return id and link.

## 3. Actions

- [x] 3.1 Route Handlers (the codebase's write pattern, instead of Server Actions): `PUT /api/events/[id]/report` and `POST /api/events/[id]/report/documents`; each calls `getAdminSession()`, validates input on the server, logs only `{ event, userId, eventId }`. Generation writes a `History` row and stores an `EventReportDocument`.

## 4. UI

- [x] 4.1 Enable the "Záró riport" tab; page `/events/[id]/report` with the sections Alapadatok, Közreműködők, Idézetek, Impact Spotlight, Generált dokumentumok.
- [x] 4.2 Generation states: pending (button disabled), success (link + "a dokumentum a saját Google Drive-odba került" notice), error with retry; re-auth prompt when the scope is missing.
- [x] 4.3 `/reports` list with Teendő / Kész / Mind tabs; "Riportok" sidebar item.

## 5. Verify

- [x] 5.1 Tests for logic, actions and pages; `npm run lint`, `npm run typecheck`, `npm test`.
- [ ] 5.2 Generate a real doc for a seeded event in the browser and check it in Google Docs.
