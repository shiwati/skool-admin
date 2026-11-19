## ADDED Requirements

### Requirement: Applicant detail page

The system SHALL provide an applicant detail page at `/applicants/{id}` for signed-in admins, inside the admin shell with the "Jelentkezők" menu item active. The page title SHALL be the applicant's name. A breadcrumb labelled "Morzsamenü" SHALL show "Jelentkezők" (linking to `/applicants`) followed by the applicant's name. A signed-out visitor SHALL be sent to the login page and, after signing in, back to the same detail page.

#### Scenario: Opening the detail page

- **WHEN** a signed-in admin opens `/applicants/{id}` for applicant Nagy Luca
- **THEN** the page shows the heading "Nagy Luca" inside the admin shell
- **AND** the breadcrumb shows "Jelentkezők › Nagy Luca" with "Jelentkezők" linking to the list

#### Scenario: Signed-out visitor

- **WHEN** a signed-out visitor opens `/applicants/{id}`
- **THEN** they are redirected to the login page with `/applicants/{id}` as the return address
- **AND** no applicant data is read or sent

### Requirement: Data is loaded on the server before rendering

The page SHALL read the applicant, their applications with program data, and the related change history from the database by the id in the URL before rendering, and SHALL deliver the complete page in the first response. No API endpoint SHALL be added for the detail data, and the page SHALL NOT show a loading state for it.

#### Scenario: First response contains the data

- **WHEN** the detail page of an existing applicant is requested
- **THEN** the first HTML response already contains the applicant's name, personal data and programs

### Requirement: Unknown or deleted applicants are not shown

When no applicant has the id in the URL, or the applicant has been deleted (anonymized), the page SHALL show a not-found page with the text "Nem található ilyen jelentkező" and a link back to "Jelentkezők", and SHALL answer with HTTP status 404. Data of a deleted applicant SHALL never be rendered.

#### Scenario: Deleted applicant

- **GIVEN** applicant "a1" was deleted
- **WHEN** an admin opens `/applicants/a1`
- **THEN** the not-found page is shown with status 404 and no data of "a1"

#### Scenario: Unknown id

- **WHEN** an admin opens `/applicants/does-not-exist`
- **THEN** the not-found page is shown with status 404

### Requirement: Detail page header

The header SHALL show an initials avatar and the name as "Vezetéknév Keresztnév". Next to the name it SHALL show these badges:

- the status label of the most recently received application, if there is one
- "16+" when the age (current year minus birth year) is at least 16
- "Hírlevél" when subscribed to the newsletter
- "Alumni" when at least one application has the status "Részt vett"

Below the name, a meta line SHALL show "Létrehozva {ÉÉÉÉ.HH.NN ÓÓ:PP}" and "Módosítva {ÉÉÉÉ.HH.NN ÓÓ:PP}", in Budapest time.

#### Scenario: Header of an alumni applicant

- **GIVEN** Nagy Luca, born 2010, subscribed to the newsletter, has applications "Python alapok – ősz" (Elfogadva, newest) and "Robotika tábor" (Részt vett)
- **WHEN** the detail page is rendered in 2026
- **THEN** the header shows the badges "Elfogadva", "16+", "Hírlevél" and "Alumni"

#### Scenario: Applicant without applications or birth year

- **WHEN** the applicant has no applications, no birth year and no newsletter subscription
- **THEN** no badges are shown

### Requirement: Personal and parent data cards

A "Személyes adatok" card SHALL list:

- Teljes név
- Születési év, with the age: "2010 · 16 év"
- E-mail
- Telefon
- Iskola
- Település

A "Szülő / gondviselő" card SHALL list:

- Név
- Anyja neve
- Cím
- E-mail
- Telefon

Missing values SHALL show "—". E-mail addresses SHALL be `mailto:` links and phone numbers SHALL be `tel:` links.

#### Scenario: Missing parent data

- **WHEN** the applicant has no parent details
- **THEN** every row of the "Szülő / gondviselő" card shows "—"

### Requirement: Programs table

A "Programok" section SHALL list every application of the applicant, most recently received first. Each row SHALL show:

- Program: the program name with its colour dot, matching the list
- Időpont: the program dates as `ÉÉÉÉ.HH.NN – ÉÉÉÉ.HH.NN`
- Státusz: a status badge with the same labels and colours as the list
- Jelentkezett: the date the application was received

The section header SHALL summarise the applications as "N jelentkezés · M elvégzett", where M counts the "Részt vett" applications. Without applications, the section SHALL show "Még nincs jelentkezése".

#### Scenario: Programs summary

- **GIVEN** the applicant has 3 applications, 2 of them with status "Részt vett"
- **WHEN** the detail page is rendered
- **THEN** the "Programok" header shows "3 jelentkezés · 2 elvégzett" and the table has 3 rows

### Requirement: Application form answers

When the applicant has at least one application, a "Jelentkezési űrlap válaszai" card SHALL show the answers of the most recently received application. Its subtitle SHALL be "{program} · beküldve {ÉÉÉÉ.HH.NN ÓÓ:PP}". It SHALL list only the answered questions, each with a label:

- Honnan hallottál rólunk?
- Kitől hallottál rólunk?
- Milyen problémát oldanál meg?
- Van programozási tapasztalatod?
- Részt vettél már Skool programon?
- Korábbi Skool program
- Más programok
- Étkezési igény
- Megjegyzés

"Részt vettél már Skool programon?" SHALL be shown only when the answer is yes, as "Igen". When no question is answered, the card SHALL say "Nincs kitöltött válasz".

#### Scenario: Only answered questions are listed

- **GIVEN** the latest application has answers only for "Honnan hallottál rólunk?" and "Megjegyzés"
- **WHEN** the detail page is rendered
- **THEN** the card lists exactly those two questions with their answers

#### Scenario: No applications

- **WHEN** the applicant has no applications
- **THEN** the "Jelentkezési űrlap válaszai" card is not shown

### Requirement: Tags card

A "Címkék" card SHALL show the badges below and the note "A 16+ címkét a rendszer a születési év alapján adja és veszi el; kézzel nem módosítható.":

- "16+ · automatikus", under the same rule as the header
- "Hírlevél"
- "Alumni"

With no applicable tag, it SHALL say "Nincs címke". The tags SHALL NOT be editable.

#### Scenario: Automatic 16+ tag

- **WHEN** a 17-year-old applicant's page is rendered
- **THEN** the "Címkék" card shows "16+ · automatikus"

### Requirement: Change history card

A "Változástörténet" card SHALL list the recorded changes of the applicant and of their applications, newest first, at most 20 entries. Each entry SHALL show:

- who made the change: the user's name, or "Rendszer" when no user is recorded
- the changed field with a Hungarian label; for an application change, also the program name
- the old and new values as "régi → új", when recorded
- when it happened, as `ÉÉÉÉ.HH.NN ÓÓ:PP` in Budapest time

Status values SHALL be shown with their status labels. Fields without a known label SHALL show their technical name. Without entries, the card SHALL say "Még nincs rögzített változás".

#### Scenario: Status change of an application

- **GIVEN** Kovács Anna changed the status of the "Python alapok – ősz" application from APPLIED to ACCEPTED
- **WHEN** the detail page is rendered
- **THEN** the history card shows "Kovács Anna módosította: Státusz (Python alapok – ősz)" with "Új jelentkező → Elfogadva" and the change time

#### Scenario: No recorded changes

- **WHEN** no history entry exists for the applicant or their applications
- **THEN** the card says "Még nincs rögzített változás"

### Requirement: Header actions

The header SHALL show the following actions:

- **"Visszaigazolás küldése"** SHALL be visible but disabled.
- **"Szerkesztés"** SHALL be visible but disabled. Each disabled action SHALL be announced as unavailable, with a tooltip saying it is coming later.
- **"További műveletek"** SHALL be a menu button whose menu contains "Törlés".

#### Scenario: Disabled actions

- **WHEN** the user tries to activate "Szerkesztés"
- **THEN** nothing happens and the button is announced as disabled

### Requirement: Deleting from the detail page

Choosing "Törlés" in the "További műveletek" menu SHALL open the same deletion confirmation as the list, naming this applicant. After a successful deletion, the user SHALL be taken to `/applicants`, and a confirmation message SHALL say the applicant was deleted. If the deletion fails, the dialog SHALL stay open with an error message and the page SHALL be unchanged.

#### Scenario: Deleting the applicant

- **WHEN** the user opens "További műveletek", chooses "Törlés", ticks "Értem, a törlés nem vonható vissza" and confirms
- **THEN** the applicant is anonymized
- **AND** the user lands on `/applicants` with a "1 jelentkező törölve" message

#### Scenario: Deletion fails

- **WHEN** the deletion request fails
- **THEN** the dialog shows "A törlés nem sikerült. Próbáld újra." and the user stays on the detail page
