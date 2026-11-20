# event-report Specification

## Purpose

Lets admins prepare the closing report of a program for the partner company at `/reports` and `/events/<id>/report`: event details, people involved, anonymous quotes from feedback and Impact Spotlight metrics, generated as a Google Doc that the team finishes by hand.

## Requirements

### Requirement: Report pages are admin-only

`/reports` and `/events/<id>/report` SHALL be reachable only by a signed-in admin, and every report Server Action SHALL reject a request without an admin session.

#### Scenario: Signed-out visitor

- **WHEN** a signed-out visitor opens `/reports`
- **THEN** they are redirected to `/login` with `/reports` as the return address

### Requirement: Report list

`/reports` SHALL list events whose end date is in the past, with the tabs "Teendő" (no generated doc), "Kész" (at least one doc) and "Mind", and for each event its end date, status, latest generation (who, when) and a link to its report tab.

#### Scenario: Event without report

- **WHEN** an event ended and no doc was generated for it
- **THEN** it appears under "Teendő" with the action "Riport készítése"

### Requirement: Report list search

A search field labelled "Szűrés programnévre" SHALL filter the listed events by program name and partner (company) name, ignoring case and accents. When nothing matches, the list SHALL show "Nincs a szűrésnek megfelelő program.".

#### Scenario: Searching by partner

- **GIVEN** an ended event "Python alapok – ősz" with the partner "Sigma Technology"
- **WHEN** the admin types "sigma" into "Szűrés programnévre"
- **THEN** the event stays in the list and events without a matching name or partner are hidden

### Requirement: Report list table

From 768 px, the events SHALL be shown in a table styled like the Programok table, with the columns "Program", "Lezárva", "Riport állapota", "Utolsó generálás" and an action column. The program name SHALL link to the program page (`/events/<id>`). The action SHALL be "Riport készítése" without a doc and "Riport megnyitása" otherwise, linking to the report tab. The table SHALL scroll inside its frame instead of widening the page.

#### Scenario: Opening the program from the table

- **WHEN** the admin activates a program name in the table at 1280 px
- **THEN** `/events/<id>` opens for that program

### Requirement: Mobile report cards

Below 768 px, the events SHALL be shown as cards instead of the table, in the same order. Each card SHALL show the colour dot and program name (linking to the program page) with the partner, the lines "Lezárva", "Riport" and "Generálva" (who and when, or "—"), and the action as a full-width button.

#### Scenario: Report list on a phone

- **WHEN** `/reports` is shown at 390 px
- **THEN** each event is a card with the lines "Lezárva", "Riport" and "Generálva" and a full-width action button, and no table is shown

### Requirement: Report content is anonymous

The generated document SHALL NOT contain applicant names or contact data. Participant data SHALL appear only as counts and age range; quotes SHALL carry only a role ("résztvevő" or "mentor").

#### Scenario: Selected quote

- **WHEN** an admin selects a participant's answer as a quote
- **THEN** the document shows the quote attributed to "résztvevő" only

### Requirement: Impact Spotlight metrics

For each supported statement the system SHALL compute the share of positive answers among the event's participant feedback (4–5 on a scale, 1–2 for reversed statements, "yes" for choice questions). A metric with no answers SHALL be shown as "nincs adat" and SHALL NOT appear in the document. Admins SHALL be able to switch any metric off.

#### Scenario: Missing answers

- **WHEN** no feedback answered "I feel capable of learning programming"
- **THEN** that metric is marked "nincs adat" and the document has no line for it

### Requirement: Quote selection

Admins SHALL be able to select at most 8 quotes, highlight at most 2, and edit the text of a selected quote. The report SHALL be in Hungarian; the app SHALL NOT translate. An English version is made with Google Docs' built-in document translation.

#### Scenario: Too many highlights

- **WHEN** an admin tries to highlight a third quote
- **THEN** the highlight is refused and the two existing highlights stay

### Requirement: Google Doc generation

"Google Doc generálása" SHALL create a new Google Doc in the signed-in admin's own Drive from the fixed Hungarian template on every run, store its link, write a `History` row, and show the link with a notice that the file was saved to the user's own Drive. Earlier documents SHALL stay listed.

#### Scenario: Second generation

- **WHEN** an admin generates the report for an event that already has a doc
- **THEN** a new doc is created, the earlier one is untouched, and both are listed

#### Scenario: Missing Drive permission

- **WHEN** the admin's Google token lacks the `drive.file` scope
- **THEN** no doc is created and the page asks the admin to sign in again
