# Spec Delta

## Purpose

Lets admins see the full recorded change history of one applicant or one program on its own page, `/history/<id>`. The applicant detail page and the program page link to it.

## ADDED Requirements

### Requirement: Change history page

The app SHALL serve an admin-only page at `/history/<id>`. The page SHALL check the admin session itself before reading any data, and without a session SHALL redirect to `/login` with `/history/<id>` as the return URL. The data SHALL be read on the server; no new API endpoint is added.

#### Scenario: Signed-out visit

- **WHEN** a signed-out user opens `/history/<id>`
- **THEN** they are redirected to `/login` with `callbackUrl=/history/<id>`
- **AND** no history data is read

### Requirement: The id names an applicant or a program

The page SHALL resolve `<id>` first as a non-deleted applicant, then as a program. When the id names neither, or names a deleted (anonymized) applicant, the page SHALL show a "Nem található ilyen változásnapló" not-found page. That page SHALL link to the applicants list and the programs list.

#### Scenario: Program id

- **WHEN** the admin opens `/history/<id>` with the id of the program "Python alapok – ősz"
- **THEN** the page shows that program's change history

#### Scenario: Deleted applicant

- **WHEN** the admin opens `/history/<id>` with the id of a deleted applicant
- **THEN** the not-found page is shown and no history is listed

### Requirement: Page header

The page SHALL look the same for an applicant and a program: a breadcrumb "<lista> › <név> › Változástörténet" and the name as the level-1 heading. The list is "Jelentkezők" (`/applicants`) or "Programok" (`/events`), and the name links to the record's own page (`/applicants/<id>` or `/events/<id>`).

#### Scenario: Applicant header

- **WHEN** the history page of "Nagy Luca" is rendered
- **THEN** the breadcrumb reads "Jelentkezők › Nagy Luca › Változástörténet"
- **AND** "Nagy Luca" links to `/applicants/<id>`

#### Scenario: Program header

- **WHEN** the history page of the program "Python alapok – ősz" is rendered
- **THEN** the breadcrumb reads "Programok › Python alapok – ősz › Változástörténet"
- **AND** "Python alapok – ősz" links to `/events/<id>`
- **AND** the program page's tab bar is not shown

### Requirement: Listed entries

For an applicant, the page SHALL list the recorded changes of the applicant and of their applications. For a program, it SHALL list the recorded changes of the program. Entries SHALL be newest first, at most the latest 200. Above the entries the page SHALL show their count ("N változás"), or "A legutóbbi 200 változás" when the limit is reached.

#### Scenario: More than 200 changes

- **GIVEN** a program has 250 recorded changes
- **WHEN** its history page is rendered
- **THEN** the latest 200 are listed
- **AND** the page says "A legutóbbi 200 változás"

### Requirement: Entries grouped by day

Entries SHALL be grouped by their day in Budapest time, under a heading: "Ma" for today, "Tegnap" for yesterday, otherwise the date in long form (e.g. "2026. november 3."). Each entry SHALL show:

- the actor's initials ("R" for "Rendszer")
- "<név> módosította: <mező>", plus the program name in parentheses for an application change
- "régi → új", when recorded
- the time as `ÓÓ:PP`

The actor is "Rendszer" when no user is recorded.

#### Scenario: Status change of an application

- **GIVEN** on 2026-11-03 at 10:12 Budapest time, Kovács Anna changed an application of "Python alapok – ősz" from APPLIED to ACCEPTED
- **WHEN** the applicant's history page is rendered
- **THEN** under "2026. november 3." the entry reads "Kovács Anna módosította: Státusz (Python alapok – ősz)", "Új jelentkező → Elfogadva" and "10:12"

#### Scenario: Late-evening UTC change

- **WHEN** an entry was recorded at 23:30 UTC on the day before today, which is already today in Budapest
- **THEN** it is listed under "Ma"

### Requirement: Empty history and what is logged

Without entries, the page SHALL say "Még nincs rögzített változás" and SHALL NOT show a count. A side card titled "Mit naplózunk a jelentkezőnél?" or "Mit naplózunk a programnál?" SHALL describe which changes are recorded.

#### Scenario: No changes

- **WHEN** a program without recorded changes has its history page opened
- **THEN** the page says "Még nincs rögzített változás"
- **AND** the "Mit naplózunk a programnál?" card is shown

### Requirement: History field labels and values

Changed fields and their values SHALL be shown the same way as on the card that previews them:

- applicant and application fields with the applicant detail page's labels and value formatting
- program fields with the program page's labels and value formatting (e.g. "Max. tanulói létszám", dates in Budapest time, lists joined with ", ")

Fields without a known label SHALL show their technical name.

#### Scenario: Mentors change

- **WHEN** Szabó Péter set the mentors of a program to Szűcs Petra and Kiss Ádám
- **THEN** the program's history page shows "Szabó Péter módosította: Mentorok" with "— → Szűcs Petra, Kiss Ádám"

#### Scenario: Status change label

- **WHEN** an application's status changed from APPLIED to ACCEPTED
- **THEN** the applicant's history page shows "Új jelentkező → Elfogadva"
