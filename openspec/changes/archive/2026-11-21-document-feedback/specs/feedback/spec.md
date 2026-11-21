## Purpose

Lets admins pull the anonymous participant and mentor feedback forms of each program from Google Sheets and browse them at `/feedback` and on the program tab `/events/<id>/feedback`, with search, filters and summary statistics.

## ADDED Requirements

### Requirement: Feedback is admin-only

`/feedback` and `/events/<id>/feedback` SHALL be reachable only by a signed-in admin, and `POST /api/events/<id>/feedback/sync` SHALL answer 401 without an admin session.

#### Scenario: Signed-out sync request

- **WHEN** a request without an admin session calls `POST /api/events/<id>/feedback/sync`
- **THEN** the response is 401 and no sheet is read

#### Scenario: Signed-out visitor on the program tab

- **WHEN** a signed-out visitor opens `/events/<id>/feedback`
- **THEN** they are redirected to `/login` with that page as the return address

### Requirement: Only configured sheets are synced

Each event MAY have a participant and a mentor feedback sheet link. The sync SHALL read only the configured sheets, using the signed-in admin's Google access, and store each response with the role of its sheet. A successful sync SHALL answer, per synced role, the counts of new and already imported responses, the row errors (sheet row number and reason) and the unrecognised headers.

#### Scenario: Only the participant sheet is set

- **GIVEN** an event with a participant feedback sheet and no mentor sheet
- **WHEN** the admin syncs it
- **THEN** only the participant sheet is read and the result contains only the participant role

### Requirement: Missing event or sheet link

The sync SHALL answer 404 for an unknown event. If no link is configured or a configured link is not a valid Google Sheet link, it SHALL answer 422 with the code `SHEET_URL_INVALID` and the message "Az eseményhez nincs érvényes visszajelző Google Sheet link megadva.".

#### Scenario: No sheet configured

- **WHEN** the admin syncs an event without feedback sheet links
- **THEN** the response is 422 with the code `SHEET_URL_INVALID`

### Requirement: Resync is idempotent

A response SHALL be unique per event, role and source key. The source key SHALL be the form timestamp plus its occurrence among rows with the same timestamp, or, for rows without a timestamp, a hash of the row content. Repeating a sync SHALL NOT create duplicates; already imported rows SHALL be counted as existing. Editing a cell of an already imported timestamped row SHALL NOT create a new response.

#### Scenario: Syncing twice

- **WHEN** the admin syncs the same unchanged sheet a second time
- **THEN** no feedback is created and every row is counted as existing

#### Scenario: Two responses in the same second

- **WHEN** two rows have the same timestamp
- **THEN** both are stored as separate responses

### Requirement: Empty and unreadable rows

Fully empty rows SHALL be skipped silently; rows with no interpretable answer SHALL be reported as row errors with the reason "Nincs értelmezhető válasz" and the rest of the sheet SHALL still be imported.

#### Scenario: Row with only dashes

- **WHEN** a row contains only placeholder answers such as "-"
- **THEN** it is reported as an error with "Nincs értelmezhető válasz" and other rows are imported

### Requirement: Required columns

The participant sheet SHALL require the timestamp, the mentor rating and the instructor rating columns; the mentor sheet SHALL require the timestamp and the overall rating columns. Columns are recognised as defined by the `sheet-mapping` capability. When a required column is missing, the sync SHALL answer 422 with the code `SHEET_HEADERS_MISSING`, the `role` of the sheet, the `missing` column labels (e.g. "Időbélyeg") and a message naming the role.

#### Scenario: Mentor sheet without overall rating

- **WHEN** the mentor sheet has no overall rating column
- **THEN** the response is 422 with `code: "SHEET_HEADERS_MISSING"`, `role: "MENTOR"` and the missing label in `missing`

### Requirement: Google access errors

When the admin's Google access is missing or expired, the sync SHALL answer 403 with the code `REAUTH_REQUIRED` and the message "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.". When a sheet cannot be read, it SHALL answer 422 with the code `SHEET_NOT_ACCESSIBLE`. Any other failure SHALL answer 500 without error details.

#### Scenario: Expired Google access

- **WHEN** the admin syncs without a usable Google token
- **THEN** the response is 403 with the code `REAUTH_REQUIRED`

### Requirement: Stored answers

Each response SHALL store its answers under stable question keys, with 1–5 scale answers as integers (text such as "4 - jó" is read by its leading digit) and placeholder answers made only of dashes or dots dropped.

#### Scenario: Scale given as text

- **WHEN** a scale cell contains "4 - jó"
- **THEN** the stored answer is 4

### Requirement: Overall score and recommendation

The overall score SHALL be, for a participant, the average of the mentor and instructor ratings present (rounded to one decimal) and, for a mentor, their own overall rating; it SHALL be empty when none of these is answered. The recommendation SHALL be "yes" for answers starting with "Igen"/"yes", "maybe" for "Talán"/"Lehet"/"maybe", "no" for "Nem"/"no", and empty otherwise or when the form has no such question.

#### Scenario: Participant overall score

- **WHEN** a participant rates the mentors 5 and the instructor 4
- **THEN** the overall score is 4.5

### Requirement: Custom question answers

Answers to per-event custom questions SHALL be stored under `custom:<label>`, shown in the details under "Egyéni kérdések" and included in text search, but SHALL NOT feed the overall score, the recommendation or the statistics.

#### Scenario: Custom question answer

- **GIVEN** the event's mapping has a custom question "Kedvenc feladat"
- **WHEN** a row answers it
- **THEN** the answer is stored under `custom:Kedvenc feladat` and does not change the overall score

### Requirement: Feedback is anonymous

Feedback SHALL NOT be linked to applicants. The details SHALL show the respondent profile under "Kitöltő (névtelen)" and state that the response is anonymous and not paired with an applicant.

#### Scenario: Opening a response

- **WHEN** the admin opens a response
- **THEN** no applicant name or link is shown and the note "A kitöltés névtelen, nincs jelentkezőhöz párosítva." is visible

### Requirement: Feedback list and filters

`/feedback` SHALL list responses newest first (responses without a timestamp last), 20 per page, with a search over free-text answers ("Keresés a szöveges válaszokban…"), a role filter "Kitöltő" ("Mindenki", "Résztvevő", "Mentor"), a period filter "Időszak" (calendar year of the program start, "Teljes időszak") and a program filter "Program" ("Minden program", listing only programs with feedback). The header SHALL show the number of responses and the time of the last import.

#### Scenario: Filtering by role

- **WHEN** the admin selects "Mentor"
- **THEN** the URL gets `role=MENTOR` and only mentor responses are listed

### Requirement: List state in the URL

The parameters `q`, `role`, `period`, `eventId`, `page` and `open` (the response shown in the details drawer) SHALL be kept in the URL; invalid values SHALL fall back to defaults.

#### Scenario: Shared link with an open response

- **WHEN** an admin opens a `/feedback` URL with `open=<id>`
- **THEN** the details drawer for that response is shown, with previous/next navigation within the page

### Requirement: Program feedback tab

`/events/<id>/feedback` SHALL show the same list pre-filtered to that program, without the program and period filters; a `period` or a response of another program in the URL SHALL be ignored. It SHALL show whether the participant and mentor sheets are set ("megadva"/"nincs"), the last import time and a sync button; without any sheet it SHALL show "Ehhez a programhoz még nincs visszajelző sheet megadva." with the link "Megadás a szerkesztésnél" and no sync button.

#### Scenario: Program without sheets

- **WHEN** the admin opens the feedback tab of a program with no feedback sheet
- **THEN** the hint with "Megadás a szerkesztésnél" is shown and there is no sync button

### Requirement: Sync feedback in the UI

After a sync the tab SHALL toast "Szinkronizálva – …" with the new and faulty row counts per role and refresh the list; on failure it SHALL toast the server message or "A szinkronizálás nem sikerült. Próbáld újra.".

#### Scenario: Successful sync

- **WHEN** a sync imports 3 new participant responses
- **THEN** a toast "Szinkronizálva – résztvevő: 3 új." appears and the list refreshes

### Requirement: Summary statistics

Above the list, the KPIs "Átlagos értékelés" (average overall score, "/ 5"), "Kitöltések" (count), "Kitöltési arány" (participant responses divided by applications with status "Részt vett" of the same programs) and "Ajánlaná másnak" (share of "yes" among recommendation answers) SHALL be computed for the current filters. The response rate SHALL be empty when a text search is active, when only mentors are shown or when no attended applicant exists ("nincs „Részt vett” jelentkező").

#### Scenario: Searching hides the response rate

- **WHEN** a text search is active
- **THEN** "Kitöltési arány" shows no value

### Requirement: Empty states

Without any response the list SHALL show "Még nincs visszajelzés" with "A program szerkesztésénél add meg a visszajelző sheeteket, majd szinkronizálj."; when filters exclude everything it SHALL show "Nincs találat" with "Módosíts a keresésen vagy a szűrőkön.".

#### Scenario: Search without match

- **WHEN** the search matches no response
- **THEN** "Nincs találat" is shown
