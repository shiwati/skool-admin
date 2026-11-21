## ADDED Requirements

### Requirement: Sync endpoint is admin-only

`POST /api/events/<id>/sync` SHALL answer 401 `{ error: "Unauthorized" }` without an admin session and SHALL NOT read the program or the sheet. An unknown program id SHALL answer 404. The sync button and result toast on the program page are specified in `event-overview` ("Applicant sheet and sync").

#### Scenario: Signed-out request

- **WHEN** a request without an admin session calls `POST /api/events/<id>/sync`
- **THEN** the response is 401 and no sheet is read

#### Scenario: Unknown program

- **WHEN** an admin syncs `does-not-exist`
- **THEN** the response is 404 `{ error: "Event not found" }`

### Requirement: Sheet location

The sync SHALL read the program's applicant sheet link (a `docs.google.com/spreadsheets/d/<id>` URL or a bare spreadsheet id). It SHALL read the worksheet given by the link's `gid` (query or hash), and the first worksheet when the link has no `gid`. A missing or unparsable link SHALL answer 422 with code `SHEET_URL_INVALID` and the message "Az eseményhez nincs érvényes Google Sheet link megadva.".

#### Scenario: Link without gid

- **WHEN** the program's link has no `gid`
- **THEN** the first worksheet of the spreadsheet is imported

#### Scenario: No link

- **WHEN** the program has no applicant sheet link
- **THEN** the response is 422 with code `SHEET_URL_INVALID`

### Requirement: Google access of the signed-in admin

The sheet SHALL be read with the signed-in admin's own Google access (read-only Sheets scope); an expired token SHALL be refreshed with the stored refresh token. When the admin has no Google account, has not granted the scope, has no refresh token, the refresh is rejected, or Google rejects the token, the sync SHALL answer 403 with code `REAUTH_REQUIRED` and the message "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet.".

#### Scenario: Scope not granted

- **WHEN** the admin's Google account lacks the Sheets read-only scope
- **THEN** the response is 403 with code `REAUTH_REQUIRED`

### Requirement: Sheet not accessible

When the spreadsheet or the worksheet is not found or not shared with the admin, the sync SHALL answer 422 with code `SHEET_NOT_ACCESSIBLE`.

#### Scenario: Sheet not shared

- **WHEN** Google answers 403 or 404 for the spreadsheet
- **THEN** the response is 422 with code `SHEET_NOT_ACCESSIBLE` and "A sheet nem található, vagy nincs hozzá hozzáférésed."

#### Scenario: Unknown gid

- **WHEN** the link's `gid` matches no worksheet
- **THEN** the response is 422 with code `SHEET_NOT_ACCESSIBLE` and "A megadott munkalap nem található."

### Requirement: Required columns

The first row SHALL be treated as headers, matched to fields as specified in `sheet-mapping`. When no column is found for last name, first name or e-mail, the sync SHALL import nothing and answer 422 with code `SHEET_HEADERS_MISSING`, the message "A sheetből hiányoznak kötelező oszlopok." and `missing` listing the missing fields.

#### Scenario: E-mail column missing

- **WHEN** the sheet has name columns but no e-mail column
- **THEN** the response is 422 with code `SHEET_HEADERS_MISSING` and `missing: ["email"]`, and no application is created

### Requirement: Row import

Each data row SHALL be imported on its own. Fully empty rows SHALL be skipped silently. A row without first or last name SHALL be reported as "Hiányzó név"; a row without an e-mail containing "@" as "Hiányzó vagy hibás e-mail cím"; such rows SHALL be reported with their sheet row number (header = row 1) and not imported.

#### Scenario: Invalid row

- **WHEN** sheet row 5 has a name but the e-mail "nincs"
- **THEN** the result contains `{ row: 5, reason: "Hiányzó vagy hibás e-mail cím" }` and the other rows are still imported

### Requirement: Imported values

Each imported row SHALL create a new applicant and an application for the program, recorded as changed by the admin. E-mail addresses SHALL be stored lowercased. A numeric timestamp SHALL be stored as the received time, interpreted in the spreadsheet's time zone.

#### Scenario: Timestamp in sheet time zone

- **WHEN** a row's timestamp is 2025-03-01 10:00 in a sheet set to Europe/Budapest
- **THEN** the application's received time is 2025-03-01 09:00 UTC

### Requirement: Idempotent re-sync

Each row SHALL be identified within the program by a source key built from its timestamp (or, without a timestamp, last and first name) and its e-mail. A row whose source key already has an application in the program SHALL be counted as existing and SHALL NOT be imported again or overwrite admin edits. This SHALL hold even after the imported applicant was merged into another one, since the application keeps its source key.

#### Scenario: Repeated sync

- **WHEN** the admin syncs twice without new form responses
- **THEN** the second sync creates nothing and reports every row as existing

#### Scenario: Re-sync after merge

- **WHEN** an imported applicant was merged into another applicant and the sheet is synced again
- **THEN** the row is reported as existing and no new applicant is created

### Requirement: Duplicate flagging

Every imported applicant SHALL get a duplicate key from last name, first name and e-mail, ignoring case, accents and extra spaces. When another non-deleted applicant has the same key, the new applicant and all applicants with that key SHALL be flagged as possible duplicates for the admin to merge; the import SHALL NOT merge them itself.

#### Scenario: Same person applies again

- **WHEN** "Kovács Anna, anna@example.com" already exists and a row "kovacs anna, ANNA@example.com" is imported
- **THEN** a new applicant is created, both are flagged as duplicates, and the row counts as created and as duplicate

### Requirement: Sync result

A successful sync SHALL answer 200 with `created`, `existing`, `duplicates` (the subset of created rows that were flagged), `errors` (row and reason) and `unmappedHeaders` (non-empty headers not used by any field). Unexpected failures SHALL answer 500 `{ error: "Internal Server Error" }` without details. The log SHALL record only the user id, program id and counts.

#### Scenario: Extra form question

- **WHEN** the sheet has a column "Póló méret" that matches no field
- **THEN** `unmappedHeaders` contains "Póló méret" and the import still succeeds
