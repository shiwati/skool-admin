# sheet-mapping Specification

## Purpose

Lets admins tell the app which Google Sheet column holds which field, for a program's application sheet and its two feedback sheets, including custom feedback questions, instead of relying only on keyword matching.

## Requirements

### Requirement: Header endpoint

`POST /api/sheets/headers` with `{ url }` SHALL return `{ headers }`: the trimmed, non-empty cells of the first row of the worksheet given by the link (the first worksheet without `gid`), read with the signed-in admin's Google access. It SHALL answer 401 without an admin session.

#### Scenario: Reading headers

- **WHEN** an admin posts a valid sheet link whose first row is "Időbélyeg", "", "Vezetéknév"
- **THEN** the response is `{ headers: ["Időbélyeg", "Vezetéknév"] }`

### Requirement: Header endpoint errors

The header endpoint SHALL answer 400 for a body that is not JSON, 422 `SHEET_URL_INVALID` ("Adj meg egy érvényes Google Sheets linket.") for a missing, over 2000 characters or unparsable link, 403 `REAUTH_REQUIRED` and 422 `SHEET_NOT_ACCESSIBLE` under the same conditions as the applicant sync, and 500 without details otherwise.

#### Scenario: Invalid link

- **WHEN** the `url` is "https://example.com/sheet"
- **THEN** the response is 422 with code `SHEET_URL_INVALID`

### Requirement: Default keyword matching

When a program has no saved applicant mapping, columns SHALL be matched to applicant fields by keywords in the header, ignoring case and extra spaces (for example "vezetéknév", "utónév"/"keresztnév", "e-mail"/"email", "időbélyeg"/"timestamp"; parent fields need "szülő" or "törvényes képviselő"). The first matching rule SHALL win, and for each field the first matching column SHALL be used; later columns for a taken field SHALL be unmapped.

#### Scenario: Parent e-mail is not the applicant e-mail

- **WHEN** the headers are "Szülő e-mail címe" and "E-mail cím"
- **THEN** the first maps to the parent e-mail and the second to the applicant e-mail

### Requirement: Saved applicant mapping

A program MAY store an applicant mapping (field → exact header). When set, it SHALL replace keyword matching: each field SHALL take the first column whose header equals the saved header, ignoring case and extra spaces; fields without a saved header or whose header is not in the sheet SHALL not be imported. A stored mapping that is not valid SHALL be ignored and keyword matching used.

#### Scenario: Renamed form question

- **WHEN** the saved mapping assigns e-mail to "Elérhetőség" and the sheet has that header
- **THEN** the sync reads e-mails from that column

### Requirement: Applicant mapping validation

Saving an applicant mapping SHALL require headers for "Vezetéknév", "Keresztnév" and "E-mail" ("Kötelező mezőhöz nincs oszlop rendelve: …") and reject unknown fields ("Ismeretlen mező: …"). Headers SHALL be stored trimmed and empty entries dropped.

#### Scenario: Saving without required field

- **WHEN** the admin saves a mapping without an e-mail header
- **THEN** the save is rejected with "Kötelező mezőhöz nincs oszlop rendelve: E-mail."

### Requirement: Feedback sheet mappings

A program MAY store a mapping for its participant and its mentor feedback sheet, each with `columns` (question key → exact header) and up to 50 `custom` questions (label, kind "scale", "text" or "choice", header). A stored mapping that is not valid SHALL be ignored and the default used.

#### Scenario: Invalid stored feedback mapping

- **WHEN** a stored participant mapping lacks the timestamp header
- **THEN** the feedback sync uses the default mapping

### Requirement: Feedback mapping validation

Saving a feedback mapping SHALL require the timestamp ("Időbélyeg") and each required question of that role, reject unknown question keys, and require each custom question to have a non-empty, unique label that does not clash with a catalog question, and a header. Headers and labels SHALL be stored trimmed; empty column entries SHALL be dropped.

#### Scenario: Duplicate custom label

- **WHEN** two custom questions are both named "Kedvenc rész"
- **THEN** the save is rejected with "Két egyéni kérdésnek nem lehet ugyanaz a neve."

### Requirement: Mapping editor

The program form SHALL show a collapsible "Mező-megfeleltetés" section for the applicant sheet and each feedback sheet, marked "Egyéni" when a mapping is saved and "Alapértelmezett" otherwise. "Fejlécek betöltése a sheetből" (disabled until the link is valid) SHALL load the headers and preselect the default matching; each field SHALL offer the sheet's headers and "— nincs hozzárendelve —", and a saved header not in the sheet SHALL be shown as "<header> (nincs a sheetben)".

#### Scenario: Header missing from sheet

- **WHEN** the saved mapping uses "E-mail cím" and the loaded headers do not contain it
- **THEN** the e-mail row offers "E-mail cím (nincs a sheetben)"

### Requirement: Mapping editor loading and custom questions

"Visszaállítás alapértelmezésre" SHALL clear the saved mapping. A failed header load SHALL show the endpoint's message, or "A fejlécek betöltése nem sikerült.". Feedback sections SHALL allow adding and removing custom questions once headers are loaded.

#### Scenario: Load fails

- **WHEN** loading the headers answers `REAUTH_REQUIRED`
- **THEN** the section shows "Jelentkezz be újra Google-lel, hogy a rendszer olvashassa a sheetet."

#### Scenario: Reset to default

- **WHEN** the admin activates "Visszaállítás alapértelmezésre" and saves the program
- **THEN** the mapping is cleared and the next sync uses keyword matching
